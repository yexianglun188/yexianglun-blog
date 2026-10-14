import { request, qs } from "./client";
import type { GitHubUser, SiteUser } from "./types";

export interface MessageItem {
  id: number;
  github_user_id: number | null;
  user_id: number | null;
  parent_id: number | null;
  content: string;
  status: string;
  likes: number;
  created_at: string;
  /** 新账号体系作者 */
  user: SiteUser | null;
  /** 历史 GitHub 登录作者（兼容旧数据） */
  github_user: GitHubUser | null;
  replies: MessageItem[];
}

export function getMessages(params?: { page?: number; size?: number }) {
  return request<MessageItem[]>(`/api/messages${qs(params)}`);
}

export function getMessagesCount() {
  return request<{ count: number }>("/api/messages/count");
}

export function createMessage(
  data: { content: string; parent_id?: number },
  token: string
) {
  return request<MessageItem>("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function likeMessage(msgId: number, unlike = false) {
  return request<MessageItem>(`/api/messages/${msgId}/${unlike ? "unlike" : "like"}`, {
    method: "POST",
  });
}
