"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { siteConfig } from "@/siteConfig";

function parseLrc(lrcText: string) {
  if (!lrcText || lrcText.length > 30000) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: { time: number; text: string }[] = [];
  for (const line of lines) {
    const matches = [...line.matchAll(/\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    if (matches.length > 0) {
      const text = line
        .replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, "")
        .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200d\ufeff]/g, "")
        .trim();
      if (text) {
        for (const match of matches) {
          const min = parseInt(match[1]);
          const sec = parseInt(match[2]);
          const ms = match[3] ? parseInt(match[3]) : 0;
          const divisor = match[3] && match[3].length === 3 ? 1000 : 100;
          result.push({ time: min * 60 + sec + ms / divisor, text });
        }
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

type PlayMode = "loop" | "single" | "random";

/** 连续多少首歌失败后停止自动跳过（再由用户手动操作） */
const MAX_AUTO_SKIP = 5;

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrcUrl: string;
  lyrics: { time: number; text: string }[];
  /** 平台：kuwo / netease 的 src 由 /api/music/url 解析（含流代理） */
  platform: "kuwo" | "netease" | "local";
  /** 歌曲 id，动态取流用 */
  songId: string;
}

/** 把后端返回的 platform 字符串归一化。
 *  早期这里写成了 (platform === "qq" ? "qq" : "netease")，
 *  导致酷我的歌全被当成网易云，取流时用酷我 id 去问网易云，必然拿不到地址。 */
function normalizePlatform(raw: unknown): Song["platform"] {
  const v = String(raw || "").toLowerCase().trim();
  if (v === "netease" || v === "kuwo" || v === "local") return v;
  return "netease";
}

interface MusicContextType {
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | undefined;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  currentLyric: string;
  allLyrics: { time: number; text: string }[];
  isLoading: boolean;
  /** 播放失败提示（如版权限制无可用音源），null 表示无错误 */
  playError: string | null;
  volume: number;
  isMuted: boolean;
  playMode: PlayMode;
  saying: string;
  refreshSaying: () => void;
  togglePlay: () => void;
  /** 切到下一首。auto=true 用于自动跳过放不了的歌，此时不改变播放/暂停状态 */
  nextSong: (auto?: boolean) => void;
  prevSong: () => void;
  handleSeek: (value: number) => void;
  playSong: (index: number) => void;
  /** 前台搜到即播：解析直链 → 追加到当前播放列表 → 立即播放（不写入数据库） */
  playSearchResult: (track: SearchTrack) => Promise<boolean>;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  togglePlayMode: () => void;
}

/** 前台搜索结果的一条（来自 /api/music/search） */
export interface SearchTrack {
  id: string;
  platform: "kuwo" | "netease";
  name: string;
  artist: string;
  album?: string;
  duration?: string;
  cover?: string;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const [currentLyric, setCurrentLyric] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [playError, setPlayError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("loop");
  const [saying, setSaying] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const playModeRef = useRef(playMode);
  const nextSongRef = useRef<(auto?: boolean) => void>(() => {});
  const isPlayingRef = useRef(isPlaying);
  // 当前歌曲真实可播放的地址。歌单接口多数不带直链（播放链接都带时效），
  // 需要切歌时调 /api/music/url 动态取；本地歌曲则直接用 song.src
  const [currentSrc, setCurrentSrc] = useState("");
  /**
   * currentSrc 属于哪一首歌（下标）。currentSrc 是跨歌共享的 state，
   * 切歌到「还没取到流」的歌时它仍指向上一首的地址；
   * 不带这个归属标记的话 <audio> 会先播错歌再切回来。
   */
  const [srcIndex, setSrcIndex] = useState(-1);
  /** 连续失败计数，配合 MAX_AUTO_SKIP 防止整列表不可播时无限跳歌 */
  const failedRef = useRef(0);

  // Fetch saying once on mount
  const refreshSaying = useCallback(() => {
    fetch("https://uapis.cn/api/v1/saying")
      .then((r) => r.json())
      .then((d) => { if (d?.text) setSaying(d.text); })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshSaying(); }, [refreshSaying]);

  // Fetch playlist from local API (uses @meting/core on server)
  useEffect(() => {
    let mounted = true;
    const fetchMusicData = async () => {
      try {
        // 优先从 API 获取动态配置，回退到静态 siteConfig
        let playlistId = siteConfig.cloudMusicPlaylistId;
        try {
          const configRes = await fetch("/api/site-config");
          if (configRes.ok) {
            const config = await configRes.json();
            // 后端会把 value 做一次 JSON 解析，所以这里可能是数组，也可能是原始字符串
            if (config.cloud_music_playlist_id !== undefined) {
              playlistId = config.cloud_music_playlist_id
                ? String(config.cloud_music_playlist_id)
                : "";
            }
          }
        } catch { /* 用静态配置回退 */ }

        // ── 1) 后台添加的歌曲（music 表，酷我 / 网易云）────────
        // 这一批通常不带直链，播放时再调 /api/music/url 动态取
        let dbSongs: Song[] = [];
        try {
          const trackRes = await fetch("/api/music/tracks");
          if (trackRes.ok) {
            const payload = await trackRes.json();
            const rows = Array.isArray(payload?.data) ? payload.data : [];
            dbSongs = rows.map((r: Record<string, string>) => ({
              id: String(r.id || Math.random()),
              title: String(r.title || r.name || "未知歌曲"),
              artist: String(r.artist || "未知歌手"),
              cover: String(r.cover || ""),
              src: String(r.src || ""),
              lrcUrl: "",
              lyrics: [] as { time: number; text: string }[],
              platform: normalizePlatform(r.platform),
              songId: String(r.songId || ""),
            }));
          }
        } catch { /* 后台歌曲加载失败不影响歌单 */ }

        // 酷我/网易云的手工歌曲要另取播放地址：
        //   - 酷我：后端 /api/music/url 给 320k mp3（索引没被版权下架，原唱可播）
        //   - 网易云：直连拿不到时跨平台解灰
        // 后端返回的已是本站流代理地址（/api/music/audio?url=...），
        // 所以浏览器不会被第三方 CDN 的 CORS 拦掉。
        //
        // 这里【不阻塞首屏】：每首歌取一次流约 0.8 秒，十几首串起来能让
        // 页面在「连接音乐云端中」卡十几秒。改成首屏先渲染歌单骨架，
        // 取流放后台并发预热，取到就回写 playlist；
        // 用户点播时若src 仍为空，会在播放 effect 里现取（见下方逻辑）。
        const preheatTargets = dbSongs.filter(
          (s) => s.platform === "netease" || s.platform === "kuwo"
        );
        const preheat = async () => {
          const CONCURRENCY = 4;
          const PER_SONG_TIMEOUT = 10_000;
          for (let i = 0; i < preheatTargets.length; i += CONCURRENCY) {
            const batch = preheatTargets.slice(i, i + CONCURRENCY);
            const got = await Promise.all(
              batch.map(async (s) => {
                try {
                  const q = new URLSearchParams({
                    platform: s.platform,
                    songmid: s.songId,
                  });
                  const res = await fetch(`/api/music/url?${q.toString()}`, {
                    signal: AbortSignal.timeout(PER_SONG_TIMEOUT),
                  });
                  if (!res.ok) return null;
                  const j = await res.json();
                  const src = String(j?.data?.url || "");
                  return src ? { key: `${s.platform}:${s.songId}`, src } : null;
                } catch {
                  return null;
                }
              })
            );
            const ok = got.filter(Boolean) as { key: string; src: string }[];
            if (ok.length === 0) continue;
            // 回写：别打断用户正在听的歌，只补 src
            setPlaylist((prev) =>
              prev.map((s) => {
                const hit = ok.find((o) => o.key === `${s.platform}:${s.songId}`);
                return hit && !s.src ? { ...s, src: hit.src } : s;
              })
            );
          }
        };

        const orderedDbSongs = dbSongs;

        // ── 2) 歌单（网易云歌单，走 meting）────────────────────
        let playlistSongs: Song[] = [];
        if (playlistId) {
          try {
            // meting 要打公网网易云，偶尔慢；设 6 秒超时，超时就只用后台歌单，
            // 不让它拖住整个首屏。
            const res = await fetch(
              `/api/music?id=${encodeURIComponent(playlistId)}&platform=netease`,
              { signal: AbortSignal.timeout(6_000) }
            );
            const data = await res.json();
            playlistSongs = (Array.isArray(data) ? data : [])
              .map((r: Record<string, string>) => ({
                id: String(r.id || Math.random()),
                title: String(r.title || r.name || "未知歌曲"),
                artist: String(r.artist || r.author || "未知歌手"),
                cover: String(r.cover || r.pic || ""),
                src: String(r.src || r.url || ""),
                lrcUrl: String(r.lrcUrl || r.lrc || ""),
                lyrics: [] as { time: number; text: string }[],
                platform: "netease" as const,
                songId: String(r.id || ""),
              }))
              .filter((s) => s.src);
          } catch { /* ignore */ }
        }

        // ── 3) 自定义本地歌曲 ─────────────────────────────────
        const custom: Song[] = (siteConfig.customTracks ?? [])
          .filter((t) => t && t.src)
          .map((t, i) => ({
            id: String(t.id || `custom-${i}`),
            title: String(t.title || "未知歌曲"),
            artist: String(t.artist || "未知歌手"),
            cover: String(t.cover || siteConfig.defaultPostCover || ""),
            src: String(t.src),
            lrcUrl: String(t.lrc || ""),
            lyrics: [] as { time: number; text: string }[],
            platform: "local" as const,
            songId: "",
          }));

        // 去重（按 id），顺序：自定义 → 后台添加 → 歌单
        const seen = new Set<string>();
        const songs = [...custom, ...orderedDbSongs, ...playlistSongs].filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });

        if (mounted) {
          if (songs.length > 0) setPlaylist(songs);
          setIsLoading(false);
          // 歌单骨架已写入，此时启动预热回写才不会被空playlist 吃掉。
          // 用户马上点播也来得及 —— 点播时 src 为空会自己现取。
          if (preheatTargets.length > 0) void preheat();
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    };
    // 兜底：任何一环卡住（meting 走公网网易云偶尔超时）都不该让用户干等 ——
    // 5 秒后强制放行，歌单先渲染出来；没 src 的歌在点播时会再取一次流。
    const forceDone = setTimeout(() => setIsLoading(false), 5_000);
    fetchMusicData().finally(() => clearTimeout(forceDone));
    return () => { mounted = false; clearTimeout(forceDone); };
  }, []);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (playlist.length === 0) return;
    const song = playlist[currentIndex];
    if (!song) return;
    let mounted = true;
    // eslint-disable-next-line
    setLyrics([]);
    setCurrentLyric("");

    if (song.lrcUrl) {
      fetch(song.lrcUrl)
        .then((r) => r.text())
        .then((text) => {
          if (!mounted) return;
          const parsed = parseLrc(text);
          setLyrics(parsed);
          setPlaylist((prev) => {
            const next = [...prev];
            next[currentIndex] = { ...next[currentIndex], lyrics: parsed };
            return next;
          });
        })
        .catch(() => {});
    } else if (song.platform === "netease") {
      // 网易云在库里没有 lrcUrl 时也动态补一次
      if (song.songId) {
        fetch(`/api/music/lyric?platform=netease&songmid=${encodeURIComponent(song.songId)}`)
          .then((r) => r.json())
          .then((d) => {
            if (!mounted) return;
            const parsed = parseLrc(String(d?.data?.lrc || ""));
            if (parsed.length > 0) setLyrics(parsed);
          })
          .catch(() => {});
      }
    } else if (song.platform === "kuwo" && song.songId) {
      // 酷我自己的歌词接口要 csrf token 拿不到，后端改用「歌名 + 歌手」
      // 去网易云匹配同名单曲的歌词。
      const qs = new URLSearchParams({
        platform: "kuwo",
        songmid: song.songId,
        name: song.title,
        artist: song.artist,
      });
      fetch(`/api/music/lyric?${qs.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          if (!mounted) return;
          setLyrics(parseLrc(String(d?.data?.lrc || "")));
        })
        .catch(() => {});
    }

    // 注意：这里不再调用 play()。续播统一由上面的「播放地址解析」effect 负责，
    // 避免在新 src 提交到 <audio> 之前就播放，导致随后 src 切换把播放重置成暂停。
    return () => { mounted = false; };
  }, [currentIndex, playlist.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  /**
   * @param auto 是否为「自动跳过」触发（放不了的歌）。
   *   自动跳过时沿用当前播放状态——用户本来暂停就不该突然出声；
   *   手动点「下一首」则一定是切歌并播放。
   */
  const nextSong = useCallback((auto = false) => {
    if (playlist.length === 0) return;
    if (playMode === "random") {
      setCurrentIndex(Math.floor(Math.random() * playlist.length));
    } else {
      setCurrentIndex((p) => (p + 1) % playlist.length);
    }
    if (!auto) setIsPlaying(true);
  }, [playMode, playlist.length]);

  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { nextSongRef.current = nextSong; }, [nextSong]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  /**
   * 播放地址解析：切歌时负责把正确的播放地址交给 <audio>。
   * - 网易云 / 本地歌曲：song.src 已经是直链，直接用
   * - 酷我 / 网易云歌单曲目：song.src 为空（播放链接带时效、不落库），
   *   先调后端 /api/music/url 拿到真实 MP3 地址
   *
   * 「开始播放」不在这里做，统一由 <audio> 的 onCanPlay 负责：
   * 新资源就绪时如果用户正处于播放状态就续播。这样避免了
   * 「play() 比 React 提交新 src 更早，结果播的是上一首，随后 src
   * 切换又把播放重置成暂停」这个时序竞态。
   */
  useEffect(() => {
    if (playlist.length === 0) return;
    const song = playlist[currentIndex];
    if (!song) return;

    // 连续失败计数：防止整张歌单都不可播时无限自动跳歌（死循环）
    failedRef.current = 0;
    setPlayError(null);

    let alive = true;
    // 本地自定义歌曲（platform=local）没有 songId，取不了流，只能用现成 src。
    if (song.platform === "local") {
      setCurrentSrc(song.src);
      setSrcIndex(currentIndex);
      return;
    }
    // 已经有可用直链（歌单接口直接给全的，或之前预热/播放时取过）就直接播
    if (song.src) {
      setCurrentSrc(song.src);
      setSrcIndex(currentIndex);
      return;
    }

    // 其余情况现取流：酷我、网易云一视同仁。
    // 早期版本写的是 `platform !== "qq"` 就直接用 song.src，导致初始化取流失败的
    // 歌点了永远没反应，也永不重试。
    //
    // 注意这里【不清空 currentSrc】：清空会让 <audio> 的 src 变成 undefined，
    // 浏览器随即触发 error，被下面的 handleAudioError 当成「这首歌坏了」
    // 自动跳下一首 —— 表现就是「点搜索结果没声音，直接切走了」。
    setIsLoading(true);
    const qs = new URLSearchParams({ platform: song.platform, songmid: song.songId });
    fetch(`/api/music/url?${qs.toString()}`, { signal: AbortSignal.timeout(15_000) })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.detail || `取流失败 (${r.status})`);
        return d;
      })
      .then((d) => {
        if (!alive) return;
        const url = d?.data?.url || "";
        if (!url) throw new Error("未取到播放地址");
        setCurrentSrc(url);
        setSrcIndex(currentIndex);
        // 回写进播放列表：同一首歌下次播放不必再请求
        setPlaylist((prev) => {
          const next = [...prev];
          next[currentIndex] = { ...next[currentIndex], src: url };
          return next;
        });
      })
      .catch((err: Error) => {
        if (!alive) return;
        // 这首歌彻底放不了：提示 + 自动跳下一首，避免用户以为播放器卡死
        setPlayError(`《${song.title}》无法播放：${err.message}`);
        failedRef.current += 1;
        if (failedRef.current <= MAX_AUTO_SKIP) {
          setTimeout(() => { nextSongRef.current(true); }, 1200);
        }
      })
      .finally(() => { if (alive) setIsLoading(false); });

    return () => { alive = false; };
  }, [currentIndex, playlist.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 音频元素报错兜底：直链过期 / CDN 抽风时 <audio> 会触发 error，
   * 此时同样提示并跳下一首（网易云直链带时效，长期挂页面后可能失效）。
   *
   * 必须先判断「当前是否真的有播放地址」：切歌到还没取到流的那首歌时，
   * <audio> 的 src 会短暂为空，浏览器也会抛 error —— 那是「还没准备好」，
   * 不是「这首歌坏了」。不加这个判断会连锁自动跳歌，表现为点了歌就没声音。
   */
  const handleAudioError = useCallback(() => {
    const song = playlist[currentIndex];
    if (!song) return;

    // 归属校验：currentSrc 可能是上一首的地址，不校验会误判「已有地址」
    const activeSrc =
      (srcIndex === currentIndex ? currentSrc : "") || song.src;
    const mediaError = audioRef.current?.error;
    if (!activeSrc) {
      // 没有地址 = 正在取流中，或本地歌没配地址。
      // 交给取流分支处理，绝不能在这里自动跳歌。
      return;
    }
    // 仅网络类错误才自动跳过；格式不支持等错误交给上层的 playError 展示
    if (mediaError && mediaError.code === 4) {
      setPlayError(`《${song.title}》网络异常，已自动跳过`);
    } else {
      setPlayError(`《${song.title}》播放出错，已自动跳过`);
    }

    failedRef.current += 1;
    if (failedRef.current <= MAX_AUTO_SKIP) {
      setTimeout(() => { nextSongRef.current(true); }, 1000);
    }
  }, [playlist, currentIndex, currentSrc, srcIndex]);

  const prevSong = useCallback(() => {
    if (playlist.length === 0) return;
    if (playMode === "random") {
      setCurrentIndex(Math.floor(Math.random() * playlist.length));
    } else {
      setCurrentIndex((p) => (p - 1 + playlist.length) % playlist.length);
    }
    setIsPlaying(true);
  }, [playMode, playlist.length]);

  const playSong = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);

    // 关键：这里必须主动触发播放。
    // 原来的实现只改state，真正的 play() 放在依赖 currentIndex 的 effect 里 ——
    // 点「当前已选中的歌」时 index 不变、effect 不重跑，就完全没有反应。
    const song = playlist[index];
    if (song?.src) {
      // 已有直链（本地 / 已解析过流）：直接播
      setCurrentSrc(song.src);
      setSrcIndex(index);
      requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => setIsPlaying(false));
      });
    }
    // src 为空时（预热还没取到流）由播放地址解析 effect 取流后续播
  }, [playlist]);

  /**
   * 前台「搜到即播」
   * 1. 已在播放列表里 → 直接切过去播
   * 2. 优先直接向后端要播放地址（酷我 / 网易云都支持），拿到就直接播
   * 3. 拿不到再靠播放地址解析 effect 兜底重试
   * 只写当前会话的播放列表，不落数据库（后台「音乐管理」才是 curated 入口）
   */
  const playSearchResult = useCallback(
    async (track: SearchTrack) => {
      // 1) 播放列表里已有 → 直接播
      const existIdx = playlist.findIndex(
        (s) => s.platform === track.platform && s.songId === track.id
      );
      if (existIdx >= 0) {
        playSong(existIdx);
        return true;
      }

      // 2) 解析播放直链。酷我也走这里 —— 早前只处理 netease，
      //    酷我搜索结果的 src 一直是空的，点了必然没声音。
      let src = "";
      let cover = track.cover || "";
      let lrcUrl = "";

      if (track.platform === "netease") {
        // 网易云走 meting，能顺带拿到歌词
        try {
          const res = await fetch(
            `/api/music?ids=${encodeURIComponent(track.id)}&platform=netease`
          );
          const data = await res.json();
          const first = Array.isArray(data) ? data[0] : null;
          if (first) {
            src = String(first.src || "");
            cover = String(first.cover || cover);
            lrcUrl = String(first.lrcUrl || "");
          }
        } catch {
          /* 解析失败就按无直链处理，交给下方 /url兜底 */
        }
      }

      if (!src) {
        // 酷我 / 网易云：直接问后端要流（返回的是本站代理地址，同源无 CORS 问题）
        // 早期这里写的是 `platform !== "qq"` 才取流，QQ 链路移除后所有平台一视同仁。
        try {
          const qs = new URLSearchParams({
            platform: track.platform,
            songmid: track.id,
          });
          const res = await fetch(`/api/music/url?${qs.toString()}`, {
            signal: AbortSignal.timeout(15_000),
          });
          if (res.ok) {
            const j = await res.json();
            src = String(j?.data?.url || "");
          }
        } catch {
          /* 下面交给 effect 重试 */
        }
      }

      const song: Song = {
        id: `${track.platform}:${track.id}`,
        title: track.name || "未知歌曲",
        artist: track.artist || "未知歌手",
        cover,
        src,
        lrcUrl,
        lyrics: [],
        platform: track.platform,
        songId: track.id,
      };

      const newIndex = playlist.length;
      setPlaylist((prev) => [...prev, song]);
      setCurrentIndex(newIndex);
      setIsPlaying(true);

      // 已经有直链就立刻续播，不等 effect —— 否则要空等一轮 state 提交
      if (src) {
        setCurrentSrc(src);
        setSrcIndex(newIndex);
        requestAnimationFrame(() => {
          audioRef.current?.play().catch(() => {
            // 自动播放策略拦截时不算失败，等onCanPlay 再试
          });
        });
        return true;
      }

      // 没直链：src 为空是允许的，播放地址解析 effect 会取流后续播
      return true;
    },
    [playlist, playSong]
  );

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);
    setProgress(dur > 0 ? (ct / dur) * 100 : 0);
    if (lyrics.length > 0) {
      const active = [...lyrics].reverse().find((l) => ct >= l.time);
      if (active) setCurrentLyric(active.text);
    }
  }, [lyrics]);

  const handleEnded = useCallback(() => {
    if (playModeRef.current === "single" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      nextSongRef.current();
    }
  }, []);

  const handleSeek = useCallback((value: number) => {
    setProgress(value);
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (value / 100) * audioRef.current.duration;
    }
  }, []);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    if (isMuted && val > 0) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => setIsMuted((p) => !p), []);

  const togglePlayMode = useCallback(() => {
    setPlayMode((p) => (p === "loop" ? "single" : p === "single" ? "random" : "loop"));
  }, []);

  return (
    <MusicContext.Provider
      value={{
        playlist, currentIndex, currentSong: playlist[currentIndex],
        isPlaying, progress, currentTime, duration,
        currentLyric, allLyrics: lyrics, isLoading, playError,
        volume, isMuted, playMode, saying, refreshSaying,
        togglePlay, nextSong, prevSong, handleSeek, playSong,
        setVolume, toggleMute, togglePlayMode, playSearchResult,
      }}
    >
      {children}
      {/* 地址还没解析出来时 src 传 undefined，避免 src="" 让浏览器重新请求整页。
          key 用歌的 id：切歌时直接重建 <audio>，上一首的网络/解码状态不会串过来。 */}
      {playlist[currentIndex] && (
        <audio
          key={playlist[currentIndex].id}
          ref={audioRef}
          src={(srcIndex === currentIndex ? currentSrc : "") ||
            playlist[currentIndex].src ||
            undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleTimeUpdate}
          onError={handleAudioError}
          onCanPlay={() => {
            // 新资源就绪时按需续播：这是全站唯一的"自动开始播放"入口。
            // 放在这里而不是 effect 里，是因为 effect 执行时 React 可能还没把
            // 新 src 提交到 DOM，提前 play() 会播上一首并被随后的 src 切换重置。
            if (isPlayingRef.current) {
              audioRef.current?.play().catch(() => setIsPlaying(false));
            }
          }}
        />
      )}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
