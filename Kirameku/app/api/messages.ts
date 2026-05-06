import { request, qs } from "./client";

export interface MessageItem {
  id: number;
  nickname: string;
  website: string;
  content: string;
  avatar: string;
  status: string;
  likes: number;
  created_at: string;
}

export function getMessages(params?: { page?: number; size?: number }) {
  return request<MessageItem[]>(`/api/messages${qs(params)}`);
}

export function createMessage(data: {
  nickname: string;
  email?: string;
  website?: string;
  content: string;
}) {
  return request<MessageItem>("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
