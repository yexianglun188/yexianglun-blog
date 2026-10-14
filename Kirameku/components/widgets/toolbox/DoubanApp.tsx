"use client";

import { useState, useEffect, useCallback } from "react";

interface DoubanItem {
  id: string;
  title: string;
  type: string;
  rating: number | null;
  rating_count: number | null;
  subtitle: string;
  description: string;
  cover: string;
}

interface DoubanList {
  total: number;
  items: DoubanItem[];
}

const TABS = [
  { key: "movie_top250", label: "电影 Top250", emoji: "🎬" },
  { key: "tv_hot", label: "热播剧集", emoji: "📺" },
  { key: "book_top250", label: "图书 Top250", emoji: "📚" },
  { key: "music_hot", label: "音乐热榜", emoji: "🎵" },
];

function ratingColor(r: number): string {
  if (r >= 9) return "text-red-500";
  if (r >= 8) return "text-amber-500";
  if (r >= 7) return "text-green-500";
  return "text-slate-500";
}

export default function DoubanApp() {
  const [tab, setTab] = useState("movie_top250");
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async (collection: string, p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/douban/list?collection=${collection}&start=${p * 20}&count=20`);
      if (!res.ok) throw new Error("请求失败");
      const data: DoubanList = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab, 0);
    setPage(0);
  }, [tab, load]);

  const switchTab = (key: string) => {
    if (key === tab) return;
    setTab(key);
  };

  const nextPage = () => {
    const p = page + 1;
    setPage(p);
    load(tab, p);
  };
  const prevPage = () => {
    const p = Math.max(0, page - 1);
    setPage(p);
    load(tab, p);
  };

  const maxPage = Math.ceil(total / 20);

  return (
    <div className="flex flex-col gap-3">
      {/* Tab 切换 */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-sky-500 text-white"
                : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-xs text-red-500 py-8">{error}</div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex gap-3 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/5"
              >
                {/* 排名 */}
                <div className="w-6 shrink-0 flex items-center justify-center">
                  <span
                    className={`text-sm font-black italic ${
                      page === 0 && idx < 3 ? "text-red-500" : "text-slate-400"
                    }`}
                  >
                    {page * 20 + idx + 1}
                  </span>
                </div>
                {/* 封面 */}
                {item.cover ? (
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-12 h-16 rounded object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-16 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                )}
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.title}
                    </h3>
                    {item.rating != null && (
                      <span className={`text-sm font-black ${ratingColor(item.rating)} shrink-0`}>
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={prevPage}
              disabled={page === 0}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              上一页
            </button>
            <span className="text-[10px] text-slate-400">
              第 {page + 1} / {Math.max(1, maxPage)} 页 · 共 {total} 条
            </span>
            <button
              onClick={nextPage}
              disabled={page >= maxPage - 1}
              className="px-2.5 py-1 rounded-lg text-xs bg-sky-500 text-white disabled:opacity-40 hover:bg-sky-600 transition-colors"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}
