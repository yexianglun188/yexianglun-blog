import { http } from "@/utils/http";

export type SiteConfigItem = {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
};

/** 获取所有站点配置 */
export const getAllSiteConfig = () => {
  return http.request<Record<string, any>>("get", "/api/site-config");
};

/** 获取单个配置 */
export const getSiteConfig = (key: string) => {
  return http.request<SiteConfigItem>("get", `/api/site-config/${key}`);
};

/** 更新单个配置 */
export const updateSiteConfig = (key: string, data: { value: string; description?: string }) => {
  return http.request<SiteConfigItem>("put", `/api/site-config/${key}`, { data });
};

/** 批量更新配置 */
export const batchUpdateSiteConfig = (configs: Record<string, any>) => {
  return http.request("put", "/api/site-config", { data: configs });
};
