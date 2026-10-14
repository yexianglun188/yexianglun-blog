"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  guestLogin as apiGuestLogin,
  type AuthResponse,
} from "@/app/api/auth";

const TOKEN_KEY = "site_auth_token";
const USER_KEY = "site_auth_user";

export interface AuthUser {
  username: string;
  nickname: string;
  avatar: string;
  isGuest: boolean;
}

interface AuthContextValue {
  /** 已登录用户（注册用户或访客），未登录为 null */
  user: AuthUser | null;
  token: string;
  /** 首次从 localStorage 恢复完成前为 false，避免闪烁 */
  ready: boolean;
  /** 是否为真实注册用户（可留言） */
  canComment: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (
    username: string,
    password: string,
    nickname?: string
  ) => Promise<AuthUser>;
  loginAsGuest: () => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): { token: string; user: AuthUser | null } {
  if (typeof window === "undefined") return { token: "", user: null };
  const token = localStorage.getItem(TOKEN_KEY) || "";
  let user: AuthUser | null = null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) user = JSON.parse(raw) as AuthUser;
  } catch {
    user = null;
  }
  if (!token) user = null;
  return { token, user };
}

function toUser(data: AuthResponse["data"]): AuthUser {
  return {
    username: data.username,
    nickname: data.nickname || data.username,
    avatar: data.avatar || "",
    isGuest: Boolean(data.isGuest),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setToken(stored.token);
    setUser(stored.user);
    setReady(true);
  }, []);

  const persist = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiLogin(username, password);
      const u = toUser(res.data);
      persist(res.data.accessToken, u);
      return u;
    },
    [persist]
  );

  const register = useCallback(
    async (username: string, password: string, nickname?: string) => {
      const res = await apiRegister(username, password, nickname);
      const u = toUser(res.data);
      persist(res.data.accessToken, u);
      return u;
    },
    [persist]
  );

  const loginAsGuest = useCallback(async () => {
    const res = await apiGuestLogin();
    const u = toUser(res.data);
    persist(res.data.accessToken, u);
    return u;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      canComment: !!user && !user.isGuest,
      login,
      register,
      loginAsGuest,
      logout,
    }),
    [user, token, ready, login, register, loginAsGuest, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
