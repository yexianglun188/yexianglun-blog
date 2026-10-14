import { http } from "@/utils/http";

export type VisitorItem = {
  id: number;
  ip: string;
  path: string;
  user_agent: string;
  /** 是否机器人 / 爬虫（User-Agent 判定） */
  is_bot: boolean;
  /** 是否本机 / 内网 IP */
  is_local: boolean;
  city: string;
  region: string;
  country: string;
  district: string;
  org: string;
  org_cn: string;
  asn: string;
  is_mobile: boolean;
  is_proxy: boolean;
  is_hosting: boolean;
  browser: string;
  os: string;
  device_type: string;
  created_at: string;
};

export type VisitorResponse = {
  code: number;
  data: VisitorItem[];
};

export type VisitorCountResponse = {
  code: number;
  count: number;
};

export type VisitorStats = {
  total: number;
  bot: number;
  local: number;
  duplicate: number;
  human: number;
};

/** 获取最近访客列表（only: human 只看真人 / bot 只看机器人 / 空 全部） */
export const getVisitors = (
  params?: { page?: number; size?: number; only?: string }
) => {
  return http.request<VisitorResponse>("get", "/api/visitors", { params });
};

/** 获取访客数 */
export const getVisitorCount = (only?: string) => {
  return http.request<VisitorCountResponse>("get", "/api/visitors/count", {
    params: { only }
  });
};

/** 获取各类访客统计 */
export const getVisitorStats = () => {
  return http.request<{ code: number; data: VisitorStats }>(
    "get",
    "/api/visitors/stats"
  );
};

/** 清理无效记录（scope: duplicate 重复 / local 本机 / bot 机器人） */
export const cleanVisitors = (scope: string) => {
  return http.request<{ code: number; deleted: number }>(
    "post",
    "/api/visitors/cleanup",
    { params: { scope } }
  );
};

/** 删除单条访客记录 */
export const deleteVisitor = (visitorId: number) => {
  return http.request<{ code: number }>("delete", `/api/visitors/${visitorId}`);
};

/** 清空所有访客记录 */
export const clearVisitors = () => {
  return http.request<{ code: number }>("delete", "/api/visitors");
};
