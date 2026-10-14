"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  UserPlus,
  UserRound,
  Lock,
  Loader2,
  ArrowLeft,
  Sparkles,
  BadgeCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { siteConfig } from "@/siteConfig";

type Tab = "login" | "register";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card p-8 animate-pulse">
        <div className="h-6 w-32 bg-slate-300/40 dark:bg-slate-600/40 rounded-lg mx-auto" />
        <div className="h-10 w-full bg-slate-300/30 dark:bg-slate-600/30 rounded-xl mt-6" />
        <div className="h-10 w-full bg-slate-300/30 dark:bg-slate-600/30 rounded-xl mt-4" />
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register, loginAsGuest } = useAuth();

  const redirect = params.get("redirect") || "/";

  const [tab, setTab] = useState<Tab>(
    params.get("tab") === "register" ? "register" : "login"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!username.trim()) return setError("请输入用户名");
    if (!password.trim()) return setError("请输入密码");
    if (tab === "register" && password.length < 6)
      return setError("密码至少 6 位");

    setLoading(true);
    try {
      if (tab === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, nickname.trim());
      }
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    if (guestLoading) return;
    setError("");
    setGuestLoading(true);
    try {
      await loginAsGuest();
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "访客登录失败");
    } finally {
      setGuestLoading(false);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setError("");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* 返回首页 */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-sky-500 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回首页
        </Link>

        <div className="glass-card p-6 sm:p-8">
          {/* 标题 */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1
              className="text-xl font-bold text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              {siteConfig.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              登录后即可在留言板留下你的足迹
            </p>
          </div>

          {/* Tab 切换 */}
          <div className="relative flex p-1 mb-5 rounded-xl bg-slate-200/50 dark:bg-slate-700/40">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === "login"
                  ? "text-slate-800 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab === "login" && (
                <motion.span
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-slate-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <LogIn className="relative w-4 h-4" />
              <span className="relative">登录</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === "register"
                  ? "text-slate-800 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab === "register" && (
                <motion.span
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-slate-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <UserPlus className="relative w-4 h-4" />
              <span className="relative">注册</span>
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field
              icon={<UserRound className="w-4 h-4" />}
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="用户名（3~20 位字母/数字/下划线）"
              autoComplete="username"
            />
            <div className="relative">
              <Field
                icon={<Lock className="w-4 h-4" />}
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder={tab === "register" ? "密码（至少 6 位）" : "密码"}
                autoComplete={
                  tab === "register" ? "new-password" : "current-password"
                }
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={showPwd ? "隐藏密码" : "显示密码"}
              >
                {showPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {tab === "register" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <Field
                    icon={<BadgeCheck className="w-4 h-4" />}
                    type="text"
                    value={nickname}
                    onChange={setNickname}
                    placeholder="昵称（选填，不填则使用用户名）"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-xs text-red-500 dark:text-red-400 px-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-medium shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tab === "login" ? "登录" : "注册并登录"}
            </button>
          </form>

          {/* 分割线 */}
          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-slate-300/60 dark:bg-slate-600/60" />
            <span className="text-[11px] text-slate-400">或</span>
            <span className="flex-1 h-px bg-slate-300/60 dark:bg-slate-600/60" />
          </div>

          {/* 访客入口 */}
          <button
            type="button"
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600/70 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-700/40 hover:border-sky-400/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {guestLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserRound className="w-4 h-4" />
            )}
            以访客身份浏览
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            访客可浏览全站内容，但不能留言；注册后即可畅所欲言
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-white/10 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/60 transition-all"
      />
    </div>
  );
}
