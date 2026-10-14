import { request } from "./client";

/** 后端 /api/auth 统一返回体 */
export interface AuthResponse {
  code: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expires: string;
    avatar: string;
    username: string;
    nickname: string;
    roles: string[];
    permissions: string[];
    isGuest: boolean;
  };
}

export function login(username: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function register(username: string, password: string, nickname?: string) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, nickname: nickname ?? "" }),
  });
}

export function guestLogin() {
  return request<AuthResponse>("/api/auth/guest", { method: "POST" });
}
