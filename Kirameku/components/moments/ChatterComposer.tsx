"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, LogOut, Send } from "lucide-react";
import { request, ApiError } from "@/app/api/client";

// 管理员凭证存在本地，仅本机可见。前台发布必须带 JWT，后端已强制鉴权。
const TOKEN_KEY = "kirameku_admin_token";

export default function ChatterComposer() {
  const [token, setToken] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const cached = localStorage.getItem(TOKEN_KEY) || "";
    if (cached) {
      setToken(cached);
      setOpen(true);
    }
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setOpen(false);
    setUsername("");
    setPassword("");
    setErr("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = await request<Record<string, unknown>>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      // 注意：后端登录接口返回被包了一层 { code, message, data: { accessToken } }，
      // 与其他直接返回实体的接口不同，这里要兼容两种结构。
      const payload = (data as Record<string, unknown>)?.data ?? data;
      const tk =
        (payload as Record<string, string>)?.accessToken ||
        (payload as Record<string, string>)?.token ||
        "";
      if (!tk) throw new Error("响应中没有 token");
      localStorage.setItem(TOKEN_KEY, tk);
      setToken(tk);
      setPassword("");
      setUsername("");
    } catch {
      setErr("登录失败，请检查账号密码");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setErr("说点什么吧～");
      return;
    }
    setErr("");
    setOk("");
    setBusy(true);
    try {
      await request("/api/chatters", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: content.trim(),
          images: [],
          mood: mood.trim(),
          // 后端默认 status="draft"，前台发布必须显式指定 published，否则存了也不显示
          status: "published",
        }),
      });
      setContent("");
      setMood("");
      setOk("发布成功 ✨");
      setTimeout(() => {
        if (mounted.current) {
          setOk("");
          window.location.reload();
        }
      }, 900);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setErr("登录已失效，请重新登录");
      } else {
        setErr("发布失败，请稍后重试");
      }
    } finally {
      setBusy(false);
    }
  }

  // 未登录：显示一个低调的入口按钮
  if (!token) {
    return (
      <div className="relative mb-6 md:mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs md:text-sm text-slate-400 hover:text-sky-500 transition-colors"
        >
          <PenLine className="w-3.5 h-3.5 md:w-4 md:h-4" />
          {open ? "收起" : "写说说"}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-4 sm:right-6 mt-8 w-[calc(100%-2rem)] sm:w-80 z-40 rounded-2xl bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-xl p-4"
            >
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  站长登录
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="账号"
                  autoComplete="username"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400 transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400 transition-colors"
                />
                {err && <div className="text-xs text-red-500">{err}</div>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 text-sm rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white transition-colors"
                >
                  {busy ? "登录中…" : "登录"}
                </button>
                <p className="text-[11px] text-slate-400">
                  仅站长可用。发布接口受后端鉴权保护，访客无法写入。
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 已登录：显示发布框
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 md:mb-8 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-lg p-4"
    >
      <form onSubmit={handlePublish} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="此刻在想些什么…"
          className="w-full px-3 py-2 text-sm md:text-base rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400 resize-none transition-colors"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="心情/地点（可选）"
            maxLength={30}
            className="flex-1 px-3 py-1.5 text-xs md:text-sm rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400 transition-colors"
          />
          <span className="text-[11px] text-slate-400 tabular-nums">
            {content.length}/500
          </span>
        </div>
        {err && <div className="text-xs text-red-500">{err}</div>}
        {ok && <div className="text-xs text-emerald-500">{ok}</div>}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            退出登录
          </button>
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {busy ? "发布中…" : "发布"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
