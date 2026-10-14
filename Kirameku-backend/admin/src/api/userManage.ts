import { http } from "@/utils/http";

export type UserItem = {
  id: number;
  username: string;
  nickname: string;
  email: string;
  bio: string;
  avatar: string;
  is_admin: boolean;
  is_guest: boolean;
  comment_count: number;
  chatter_count: number;
  message_count: number;
  created_at: string;
  updated_at: string | null;
};

export type UserListResponse = {
  code: number;
  data: { items: UserItem[]; total: number };
};

/** 用户列表（可按用户名/昵称/邮箱搜索） */
export const getUsers = (params?: {
  keyword?: string;
  page?: number;
  size?: number;
}) => {
  return http.request<UserListResponse>("get", "/api/admin/users", { params });
};

/** 修改用户资料 / 管理员身份 */
export const updateUser = (
  userId: number,
  data: { nickname?: string; email?: string; bio?: string; is_admin?: boolean }
) => {
  return http.request("patch", `/api/admin/users/${userId}`, { data });
};

/** 重置密码 */
export const resetUserPassword = (userId: number, password: string) => {
  return http.request("post", `/api/admin/users/${userId}/reset-password`, {
    data: { password }
  });
};

/** 删除用户（其发言保留，作者置空） */
export const deleteUser = (userId: number) => {
  return http.request("delete", `/api/admin/users/${userId}`);
};
