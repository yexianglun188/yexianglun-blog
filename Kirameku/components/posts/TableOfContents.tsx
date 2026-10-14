"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListTree, ChevronDown } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * 从 Markdown 原文提取 h2/h3 标题（跳过 ``` 代码块内的 # 注释）。
 * id 与页面渲染后按顺序赋予 DOM 标题的 id 保持一致（heading-<index>）。
 */
export function extractHeadings(content: string): TocItem[] {
  if (!content) return [];
  // 按代码围栏切分，只处理非代码段，避免把代码里的 # 注释当成标题
  const segments = content.split(/```[\s\S]*?```/g);
  const items: TocItem[] = [];
  for (const seg of segments) {
    const lines = seg.split("\n");
    for (const line of lines) {
      const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line.trim());
      if (m) {
        items.push({
          id: `heading-${items.length}`,
          text: m[2].replace(/[*`_]/g, ""),
          level: m[1].length as 2 | 3,
        });
      }
    }
  }
  return items;
}

const SCROLL_OFFSET = 90; // 预留顶部导航栏高度

export default function TableOfContents({
  content,
  containerRef,
}: {
  content: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const ticking = useRef(false);

  // 渲染后给 DOM 标题按顺序赋 id（与 extractHeadings 一一对应）
  useEffect(() => {
    if (!containerRef.current || !headings.length) return;
    const nodes = containerRef.current.querySelectorAll(".post-content h2, .post-content h3");
    nodes.forEach((el, i) => {
      if (headings[i]) el.id = headings[i].id;
    });
  }, [headings, containerRef]);

  // 滚动高亮当前章节
  useEffect(() => {
    if (!headings.length) return;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        let current = "";
        for (const h of headings) {
          const el = document.getElementById(h.id);
          if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET + 40) current = h.id;
        }
        // 已滚到底部时高亮最后一项
        if (
          window.innerHeight + window.scrollY >= document.body.scrollHeight - 4 &&
          headings.length
        ) {
          current = headings[headings.length - 1].id;
        }
        setActiveId(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  if (headings.length < 2) return null;

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* 移动端 / 平板：文章顶部可折叠目录条 */}
      <div className="xl:hidden mb-5">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
        >
          <span className="flex items-center gap-2">
            <ListTree className="w-4 h-4 text-indigo-500" />
            目录（{headings.length} 节）
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileOpen && (
          <ul className="mt-2 rounded-xl bg-white/60 dark:bg-slate-900/70 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-lg overflow-hidden max-h-[50vh] overflow-y-auto">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => jump(h.id)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    h.level === 3 ? "pl-8" : ""
                  } ${
                    activeId === h.id
                      ? "text-indigo-500 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-500/10 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 桌面端（xl 及以上）：右侧悬浮目录 */}
      <aside className="hidden xl:block fixed right-6 top-28 w-60 max-h-[70vh] overflow-y-auto rounded-2xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-xl p-4 z-20">
        <div className="flex items-center gap-2 mb-3 text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
          <ListTree className="w-4 h-4 text-indigo-500" />
          目录
        </div>
        <ul className="space-y-1">
          {headings.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => jump(h.id)}
                title={h.text}
                className={`w-full text-left text-sm leading-snug py-1 truncate transition-all duration-200 ${
                  h.level === 3 ? "pl-4 text-[13px]" : ""
                } ${
                  activeId === h.id
                    ? "text-indigo-500 dark:text-indigo-300 font-semibold translate-x-0.5"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
