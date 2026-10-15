import { http } from "@/utils/http";

/** 平台标识：kuwo=酷我音乐 / netease=网易云音乐 */
export type MusicPlatform = "kuwo" | "netease";

/** 搜索结果（多平台统一结构） */
export type MusicSearchItem = {
  id: string;
  platform: MusicPlatform;
  name: string;
  artist: string;
  album: string;
  duration: string;
  cover?: string;
  added: boolean;
};

/** 已选歌曲 */
export type MusicSelectedItem = {
  id: string;
  platform: MusicPlatform;
  name: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  media_url: string;
};

// 酷我排第一：网易云的搜索索引会过滤掉周杰伦等高版权歌曲的原唱（搜「晴天」只出翻唱），
// 酷我索引完整，能直接搜到原唱。
export const PLATFORM_OPTIONS: { value: MusicPlatform; label: string }[] = [
  { value: "kuwo", label: "酷我音乐" },
  { value: "netease", label: "网易云音乐" }
];

/** 按歌名搜索（platform 决定走哪个平台） */
export const searchMusic = (keyword: string, platform: MusicPlatform, limit = 20) => {
  return http.request<MusicSearchItem[]>("get", "/api/music-admin/search", {
    params: { keyword, platform, limit }
  });
};

/** 已选歌曲列表 */
export const getSelectedMusic = () => {
  return http.request<MusicSelectedItem[]>("get", "/api/music-admin/list");
};

/** 添加歌曲（platform + id） */
export const addMusic = (data: {
  id: string;
  name: string;
  artist: string;
  platform: MusicPlatform;
  album?: string;
  cover?: string;
  duration?: string;
}) => {
  return http.request<{ ok: boolean; duplicated: boolean; total: number }>(
    "post",
    "/api/music-admin/add",
    { data }
  );
};

/** 移除歌曲（需同时传平台，两个平台的 id 可能重复） */
export const removeMusic = (id: string, platform: MusicPlatform) => {
  return http.request<{ ok: boolean; total: number }>(
    "delete",
    `/api/music-admin/${platform}/${id}`
  );
};

/** 清空已选歌曲 */
export const clearMusic = () => {
  return http.request<{ ok: boolean; total: number }>(
    "post",
    "/api/music-admin/clear"
  );
};
