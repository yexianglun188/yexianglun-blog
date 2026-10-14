"use client";

import { useMemo } from "react";
import type { MessageItem } from "@/app/api/messages";
import { displayName, avatarOf } from "@/app/api/types";

/**
 * 留言板顶部弹幕带：循环滚动已有留言（只取顶层留言，忽略楼中楼回复）。
 * 纯 CSS 动画，无 JS 定时器，性能友好。留言为空时不渲染。
 */
export default function MessageDanmaku({ messages }: { messages: MessageItem[] }) {
  const tops = useMemo(() => messages.filter((m) => !m.parent_id), [messages]);

  if (tops.length === 0) return null;

  // 每条弹幕：昵称 + 内容，随机分配轨道（top）和延迟，避免重叠
  const rows = tops.slice(0, 30);

  return (
    <div
      className="relative w-full h-24 md:h-28 overflow-hidden rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 mb-4 md:mb-6 pointer-events-none select-none"
      aria-label="留言弹幕"
    >
      {/* 顶部渐变遮罩，让弹幕在两端淡入淡出 */}
      <div className="absolute inset-y-0 left-0 w-12 md:w-20 bg-gradient-to-r from-white/70 dark:from-slate-900/60 to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-12 md:w-20 bg-gradient-to-l from-white/70 dark:from-slate-900/60 to-transparent z-10" />

      {rows.map((m, i) => {
        const author = m.user ? { user: m.user } : { github_user: m.github_user };
        const name = displayName(author);
        const avatar = avatarOf(author);
        const lane = i % 4; // 4 条轨道
        const top = 8 + lane * 22; // 轨道纵向位置
        const duration = 10 + (i % 6) * 2.5; // 10~22s 一条
        const delay = -((i * 3.7) % duration); // 负延迟，页面一进来就有弹幕在中间

        return (
          <div
            key={m.id}
            className="absolute whitespace-nowrap flex items-center gap-1.5"
            style={{
              top: `${top}px`,
              animation: `danmaku-scroll ${duration}s linear ${delay}s infinite`,
            }}
          >
            {avatar?.avatar ? (
              <img
                src={avatar.avatar}
                alt=""
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {name[0]}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
              {name}：
            </span>
            <span className="text-xs md:text-sm text-slate-700 dark:text-slate-200">
              {m.content}
            </span>
          </div>
        );
      })}

      <style>{`
        @keyframes danmaku-scroll {
          from { transform: translateX(100%); }
          to { transform: translateX(calc(-100% - 100vw)); }
        }
      `}</style>
    </div>
  );
}
