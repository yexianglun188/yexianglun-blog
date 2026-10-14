"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MousePointerClick, RefreshCw, Search } from "lucide-react";
import {
  getCategories,
  getBooks,
  toSlug,
  type CategoryItem,
  type BookItem,
} from "@/app/api/novel/novel-api";
import BookCard, { EmptyState } from "./_lib/BookCard";
import LoadingTips from "./_lib/LoadingTips";

export default function NovelPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [jump, setJump] = useState("");

  // 只加载分类名（本地常量，不触发对上游的抓取）
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError("分类加载失败"));
  }, []);

  /**
   * 按需抓取：只有用户点击分类 / 翻页 / 刷新时才请求上游。
   * 命中后端 TTL 缓存时瞬间返回，未命中才真正去爬。
   */
  const loadBooks = useCallback(async (category: string, p: number, refresh = false) => {
    if (!category) return;
    setLoading(true);
    setError("");
    try {
      const data = await getBooks(category, p, refresh);
      setBooks(data.list);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      setError("抓取失败，请稍后重试（上游站点可能暂时不可用）");
    } finally {
      setLoading(false);
    }
  }, []);

  const pickCategory = (key: string) => {
    setActive(key);
    setJump("");
    loadBooks(key, 1);
  };

  const goPage = (p: number, refresh = false) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setJump("");
    loadBooks(active, next, refresh);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const commitJump = () => {
    const v = Number(jump);
    if (jump && v >= 1 && v <= totalPages) goPage(v);
    setJump("");
  };

  const doSearch = () => {
    const q = keyword.trim();
    if (q) router.push(`/novel/search?q=${encodeURIComponent(q)}`);
  };

  const idle = !active && !loading && !error;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12" style={{ maxWidth: "72rem" }}>
      {/* 标题 + 搜索 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">小说书城</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            免费在线阅读 · 共 {categories.length || 17} 个分类 · 点击分类后按需抓取
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-80">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="搜索书名 / 关键词..."
            className="flex-1 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-sky-400 dark:focus:border-sky-500 transition-colors"
          />
          <button
            type="button"
            onClick={doSearch}
            aria-label="搜索"
            className="px-4 py-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 分类标签：点击即抓取 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => pickCategory(c.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              active === c.key
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-white/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:text-sky-600"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 未选择分类：空态提示，不发起任何上游请求 */}
      {idle && (
        <div className="text-center py-24 text-slate-400">
          <MousePointerClick className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-base">点击上面的分类开始浏览</p>
          <p className="text-sm mt-2 opacity-70">只有点击后才会去抓取数据，避免无谓的请求</p>
        </div>
      )}

      {loading && <LoadingTips />}
      {error && (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          {active && (
            <button
              type="button"
              onClick={() => goPage(page, true)}
              className="px-5 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-600 dark:text-slate-400 hover:text-sky-500 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      )}

      {!loading && !error && active && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              当前分类：{categories.find((c) => c.key === active)?.name || active}
            </p>
            <button
              type="button"
              onClick={() => goPage(page, true)}
              title="强制重新抓取（绕过缓存）"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 hover:text-sky-500 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 刷新
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book, i) => (
              <motion.div
                key={`${active}-${page}-${book.bookUrl}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <BookCard
                  book={book}
                  onClick={() => router.push(`/novel/${toSlug(book.bookUrl)}`)}
                />
              </motion.div>
            ))}
          </div>
          {books.length === 0 && <EmptyState text="这个分类暂时没有书籍" />}

          {/* 分页 */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <button
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-600 dark:text-slate-400 hover:text-sky-500 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> 上一页
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={jump}
                placeholder={String(page)}
                onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && commitJump()}
                onBlur={commitJump}
                className="w-16 px-2 py-1.5 text-center text-sm rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 outline-none focus:border-sky-400"
              />
              <span className="text-sm text-slate-500">/ {totalPages} 页</span>
            </div>
            <button
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-600 dark:text-slate-400 hover:text-sky-500 disabled:opacity-40 transition-colors"
            >
              下一页 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
