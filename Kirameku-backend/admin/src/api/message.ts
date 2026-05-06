import { http } from "@/utils/http";

export type MessageItem = {
  id: number;
  nickname: string;
  email: string;
  website: string;
  content: string;
  avatar: string;
  ip: string;
  status: string;
  likes: number;
  created_at: string;
};

/** 管理-获取留言列表 */
export const getAdminMessages = (params?: {
  status?: string;
  page?: number;
  size?: number;
}) => {
  return http.request<MessageItem[]>("get", "/api/messages/admin", { params });
};

/** 更新留言状态 */
export const updateMessageStatus = (messageId: number, status: string) => {
  return http.request("put", `/api/messages/${messageId}/status`, {
    data: { status }
  });
};

/** 删除留言 */
export const deleteMessage = (messageId: number) => {
  return http.request<{ ok: boolean }>("delete", `/api/messages/${messageId}`);
};
