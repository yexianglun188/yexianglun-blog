"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UserRound, LogIn, Loader2, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { siteConfig } from "@/siteConfig";

/**
 * 入门守卫：没有身份（未登录 / 未使用访客模式）的人，
 * 必须先选择「以访客身份进入」或「登录 / 注册」才能浏览站内内容。
 * 例外：/login 页面本身不拦，否则会把自己也挡在外面。
 */
export default function GuestGate() {
  const { user, ready, loginAsGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState("");

  const isLoginPage = pathname?.startsWith("/login");
  const blocked = ready && !user && !isLoginPage;

  // 守卫显示时锁定滚动，关闭后恢复
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (blocked) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [blocked]);

  async function handleGuest() {
    if (guestLoading) return;
    setError("");
    setGuestLoading(true);
    try {
      await loginAsGuest();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "访客进入失败，请重试");
    } finally {
      setGuestLoading(false);
    }
  }

  function handleLogin() {
    const redirect =
      pathname && pathname !== "/" ? `?redirect=${encodeURIComponent(pathname)}` : "";
    router.push(`/login${redirect}`);
  }

  return (
    <AnimatePresence>
      {blocked && (
        <motion.div
          key="guest-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 overflow-y-auto"
        >
          {/* 毛玻璃遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/80 via-white/80 to-indigo-100/80 dark:from-slate-950/90 dark:via-slate-900/90 dark:to-indigo-950/90 backdrop-blur-xl" />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="relative w-full max-w-md my-auto"
          >
            <div className="glass-card p-8 md:p-10 text-center">
              {/* 站点标识 */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-white/10 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 tracking-wide">
                  {siteConfig.title}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-3">
                {siteConfig.signature || "欢迎光临"}
              </h1>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-7">
                本站需要先确认身份才能浏览。
                <br />
                没有账号也没关系 —— 以
                <span className="font-medium text-sky-600 dark:text-sky-400">访客身份</span>
                即可进入参观，
                <br className="hidden sm:block" />
                注册登录后还能留言、评论和互动。
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGuest}
                  disabled={guestLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-lg shadow-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {guestLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserRound className="w-4 h-4" />
                  )}
                  {guestLoading ? "正在进入..." : "以访客身份进入"}
                </button>

                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-700 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  登录 / 注册账号
                </button>
              </div>

              {error && (
                <p className="mt-4 text-xs text-red-500 dark:text-red-400">{error}</p>
              )}

              <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <Lock className="w-3 h-3" />
                访客可以浏览全站内容，但无法留言与评论
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
