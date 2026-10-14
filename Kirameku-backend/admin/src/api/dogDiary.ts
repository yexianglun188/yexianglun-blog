import { http } from "@/utils/http";

export type DogDiaryItem = {
  id: number;
  content: string;
  author: string;
  sort: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string | null;
};

/** 后台列表（含未启用，可按关键词搜索） */
export const getAdminDogDiaries = (keyword?: string) => {
  return http.request<DogDiaryItem[]>("get", "/api/dog-diary/admin", {
    params: { keyword }
  });
};

/** 新增日记 */
export const createDogDiary = (data: {
  content: string;
  author?: string;
  sort?: number;
  is_approved?: boolean;
}) => {
  return http.request<DogDiaryItem>("post", "/api/dog-diary", { data });
};

/** 修改日记 */
export const updateDogDiary = (
  diaryId: number,
  data: Partial<Omit<DogDiaryItem, "id">>
) => {
  return http.request<DogDiaryItem>("put", `/api/dog-diary/${diaryId}`, { data });
};

/** 删除日记 */
export const deleteDogDiary = (diaryId: number) => {
  return http.request<{ ok: boolean }>("delete", `/api/dog-diary/${diaryId}`);
};
