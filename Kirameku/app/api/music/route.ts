import { NextRequest, NextResponse } from "next/server";
import Meting from "@meting/core";
import { siteConfig } from "@/siteConfig";

interface SongData {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrcUrl: string;
}

// @meting/core 支持的平台：网易云 / QQ音乐 / 酷狗 / 百度 / 酷我
const SUPPORTED_PLATFORMS = ["netease", "tencent", "kugou", "baidu", "kuwo"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

// 自定义歌曲（本地文件或外链），不受平台版权限制，永远可用
function buildCustomTracks(): SongData[] {
  const list = siteConfig.customTracks ?? [];
  return list
    .filter((t) => t && t.src)
    .map((t, i) => ({
      id: String(t.id || `custom-${i}`),
      title: String(t.title || "未知歌曲"),
      artist: String(t.artist || "未知歌手"),
      cover: String(t.cover || siteConfig.defaultPostCover || ""),
      src: String(t.src),
      lrcUrl: String(t.lrc || ""),
    }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get("id");
  const songIds = searchParams.get("ids");

  // 平台可切换：netease(网易云) / tencent(QQ音乐) / kugou / baidu / kuwo
  const rawPlatform = (
    searchParams.get("platform") ||
    siteConfig.cloudMusicPlatform ||
    "netease"
  )
    .toLowerCase()
    .trim() as Platform;
  const platform: Platform = SUPPORTED_PLATFORMS.includes(rawPlatform) ? rawPlatform : "netease";

  const custom = buildCustomTracks();

  // 没有指定歌单/歌曲时，仅返回自定义歌曲
  if (!playlistId && !songIds) {
    return NextResponse.json(custom);
  }

  const meting = new Meting(platform);
  meting.format(true);

  try {
    let tracks: { id: string; name: string; artist: string[]; pic_id: string; url_id: string; lyric_id: string }[] = [];

    // 手工挑选的歌曲（来自后台「音乐管理」，写入 cloud_music_ids）优先，排在歌单前面
    if (songIds) {
      const ids = songIds.split(",").map((s) => s.trim()).filter(Boolean);
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const raw = await meting.song(id);
            const parsed = JSON.parse(raw as string);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return [];
          }
        })
      );
      tracks = results.flat();
    }

    // 歌单追加在后；与手工挑选的歌曲按 id 去重，避免同一首出现两次
    if (playlistId) {
      const raw = await meting.playlist(playlistId);
      const parsed = JSON.parse(raw as string);
      const fromPlaylist = Array.isArray(parsed) ? parsed : [];
      const seen = new Set(tracks.map((t) => String(t.id)));
      tracks = tracks.concat(fromPlaylist.filter((t) => !seen.has(String(t.id))));
    }

    // 批量获取 URL
    const songs: SongData[] = await Promise.all(
      tracks.map(async (track) => {
        let src = "";
        try {
          const urlRaw = await meting.url(track.url_id, 320);
          const urlData = JSON.parse(urlRaw as string);
          src = (urlData.url || "").replace(/^http:\/\//, "https://");
        } catch {
          // ignore
        }

        let cover = "";
        try {
          const picRaw = await meting.pic(track.pic_id, 300);
          const picData = JSON.parse(picRaw as string);
          cover = (picData.url || "").replace(/^http:\/\//, "https://");
        } catch {
          // ignore
        }

        return {
          id: String(track.id),
          title: track.name || "未知歌曲",
          artist: Array.isArray(track.artist) ? track.artist.join(", ") : String(track.artist || "未知歌手"),
          cover,
          src,
          lrcUrl: track.lyric_id ? `https://api.injahow.cn/meting/?server=${platform}&type=lrc&id=${track.lyric_id}` : "",
        };
      })
    );

    // 自定义歌曲排在前面
    return NextResponse.json([...custom, ...songs.filter((s) => s.src)]);
  } catch (err) {
    // 上游平台拉取失败时，至少保证自定义歌曲仍可用
    console.error(`Meting error (platform=${platform}):`, err);
    if (custom.length) {
      return NextResponse.json(custom);
    }
    return NextResponse.json(
      { error: `获取音乐数据失败（平台 ${platform}）` },
      { status: 500 }
    );
  }
}
