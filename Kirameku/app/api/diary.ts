import { request } from "./client";

export interface DogDiaryItem {
  id: number;
  content: string;
  author: string;
  sort: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string | null;
}

/** 随机取一条（后台维护、已启用的日记）；没有数据时返回 null */
export function getRandomDiary() {
  return request<DogDiaryItem | null>("/api/dog-diary/random");
}

/** 全部已启用日记（备用：可用来做本地随机，避免重复请求） */
export function getDiaries() {
  return request<DogDiaryItem[]>("/api/dog-diary");
}
