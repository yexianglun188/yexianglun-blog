import { http } from "@/utils/http";

/** 平台标识：netease=网易云音乐 / qq=QQ音乐 */
export type MusicPlatform = "netease" | "qq";

/** 搜索结果（双平台统一结构） */
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

export const PLATFORM_OPTIONS: { value: MusicPlatform; label: string }[] = [
  { value: "netease", label: "网易云音乐" },
  { value: "qq", label: "QQ音乐" }
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

/** 添加歌曲（platform + id：网易云传数字id，QQ传songmid） */
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

/** 移除歌曲（需同时传平台，netease/qq 的 id 可能重复） */
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

/** QQ 音乐登录态状态 */
export const getQqStatus = () => {
  return http.request<{
    online: boolean;
    uin: string;
    hasVkeyCredential: boolean;
    hint: string;
  }>("get", "/api/music-admin/qq-status");
};

/** 注入 QQ 音乐网页版 cookie（vkey 取流必须） */
export const setQqCookie = (cookie: string) => {
  return http.request<{ ok: boolean; message: string }>(
    "post",
    "/api/music-admin/qq-cookie",
    { data: { cookie } }
  );
};
