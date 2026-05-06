import { request, qs } from "./client";

export interface ChatterItem {
  id: number;
  content: string;
  images: string[];
  mood: string;
  likes: number;
  comments_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatterCommentItem {
  id: number;
  chatter_id: number;
  parent_id: number | null;
  nickname: string;
  content: string;
  avatar: string;
  status: string;
  created_at: string;
  replies: ChatterCommentItem[];
}

export function getChatters(params?: {
  status?: string;
  page?: number;
  size?: number;
}) {
  return request<ChatterItem[]>(`/api/chatters${qs(params)}`);
}

export function getChattersCount(status?: string) {
  return request<{ count: number }>(
    `/api/chatters/count${qs({ status })}`
  );
}

export function getChatterById(chatterId: number) {
  return request<ChatterItem>(`/api/chatters/${chatterId}`);
}

export function getChatterComments(chatterId: number) {
  return request<ChatterCommentItem[]>(
    `/api/chatters/${chatterId}/comments`
  );
}

export function createChatterComment(data: {
  chatter_id: number;
  parent_id?: number;
  nickname: string;
  email?: string;
  content: string;
}) {
  return request<ChatterCommentItem>("/api/chatters/comments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
