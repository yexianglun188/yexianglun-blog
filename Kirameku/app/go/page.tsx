"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";

/**
 * 站外链接跳转确认页 `/go?url=...&name=...&icon=...&from=...`
 *
 * 为什么需要它：站内不少地方要跳到别人的网站（收藏夹、友链…）。
 * 直接 href 跳过去时，手机浏览器 / 微信等内置 WebView 经常忽略
 * target="_blank"，当前页被直接替换掉 —— 用户进了别人的站，
 * 站内导航栏也没了，想回来只能手输网址。
 *
 * 所以改成两步：先落到本站的这个中间页（随时可后退），
 * 由用户主动确认后再开新标签前往。任何环境都不会迷路。
 *
 * 参数：
 *   url   目标地址（只接受 http/https）
 *   name  站点名，用于展示
 *   icon  站点图标
 *   from  返回路径，默认 /bookmark
 */

const DEFAULT_FROM = "/bookmark";

/** 只允许 http/https，挡掉 javascript: / data: 之类的注入 */
function safeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* 非法 URL */
  }
  return "";
}

/** 返回路径只允许站内相对路径，防止被构造成跳外站 */
function safeFrom(raw: string): string {
  const v = (raw || "").trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return DEFAULT_FROM;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function GoInner() {
  const params = useSearchParams();
  const router = useRouter();

  const name = params.get("name") || "这个站点";
  const icon = params.get("icon") || "";
  const target = safeUrl(params.get("url") || "");
  const from = safeFrom(params.get("from") || "");

  // Esc 直接返回来源页
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(from);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, from]);

  const openTarget = () => {
    if (!target) return;
    // 新标签打开；被浏览器拦截（如内置 WebView）时降级为当前页跳转
    const w = window.open(target, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = target;
  };

  if (!target) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 relative z-10">
        <div className="rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            链接无效
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            目标地址缺失，或不是合法的 http / https 链接。
          </p>
          <Link
            href={from}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 md:py-20 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-xl p-6 md:p-8 text-center"
      >
        {/* 站点图标 */}
        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-slate-700/40 flex items-center justify-center">
          {icon ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={icon}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <ExternalLink className="w-8 h-8 text-slate-400" />
          )}
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white break-all">
          {name}
        </h1>
        <p className="mt-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 break-all">
          {hostOf(target)}
        </p>

        <div className="mt-5 mb-6 px-4 py-3 rounded-xl bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
          <p className="text-xs md:text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            你即将离开本站，前往上方这个外部网站。
            <br className="hidden md:block" />
            本站页面会保留在原来的标签页里，随时可以切回来。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            onClick={openTarget}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            在新标签打开
          </button>
          <Link
            href={from}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-white/50 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-white/80 dark:hover:bg-slate-700/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
        </div>

        {/* 原生链接兜底：部分内置浏览器不支持 window.open */}
        <p className="mt-5 text-[11px] text-slate-400 dark:text-slate-500">
          打不开？
          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-sky-500 hover:text-sky-600 underline"
          >
            点这里直接访问
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function GoPage() {
  // useSearchParams 在 App Router 里要求包一层 Suspense
  return (
    <Suspense
      fallback={<div className="text-center py-20 text-slate-400">加载中...</div>}
    >
      <GoInner />
    </Suspense>
  );
}
