import { request } from "./client";

export interface CommentItem {
  id: number;
  post_id: number;
  parent_id: number | null;
  nickname: string;
  website: string;
  content: string;
  avatar: string;
  status: string;
  created_at: string;
  replies: CommentItem[];
}

export function getPostComments(postId: number) {
  return request<CommentItem[]>(`/api/comments/post/${postId}`);
}

export function createComment(data: {
  post_id: number;
  parent_id?: number;
  nickname: string;
  email?: string;
  website?: string;
  content: string;
}) {
  return request<CommentItem>("/api/comments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
