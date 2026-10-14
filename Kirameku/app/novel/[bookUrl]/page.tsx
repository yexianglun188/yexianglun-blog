"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getBook,
  getChapters,
  type BookDetail,
  type ChapterItem,
} from "@/app/api/novel/novel-api";
import LoadingTips from "../_lib/LoadingTips";

const CHAPTER_PAGE_SIZE = 100;

export default function NovelBookPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.bookUrl as string) || "";

  const [book, setBook] = useState<BookDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadChapters = useCallback(async (p: number) => {
    const data = await getChapters(slug, p, CHAPTER_PAGE_SIZE);
    setChapters(data.list);
    setTotal(data.total);
    setPage(p);
  }, [slug]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [detail, chapterData] = await Promise.all([getBook(slug), getChapters(slug, 1, CHAPTER_PAGE_SIZE)]);
        if (!alive) return;
        if (!detail) {
          setError("书籍不存在或已下架");
          return;
        }
        setBook(detail);
        setChapters(chapterData.list);
        setTotal(chapterData.total);
      } catch {
        if (alive) setError("加载失败，请稍后重试");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const maxPage = Math.max(1, Math.ceil(total / CHAPTER_PAGE_SIZE));

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12" style={{ maxWidth: "56rem" }}>
      <button
        type="button"
        onClick={() => router.push("/novel")}
        className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回书城
      </button>

      {loading && <LoadingTips />}
      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {!loading && !error && book && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* 书籍信息 */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-8 mb-8">
            <div className="flex flex-col sm:flex-row gap-6">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.name}
                  width={128}
                  height={176}
                  className="rounded-xl object-cover flex-shrink-0 mx-auto sm:mx-0 bg-slate-100 dark:bg-slate-700 shadow-lg"
                />
              ) : (
                <div className="w-32 h-44 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 p-2 shadow-lg">
                  <span className="text-white text-sm font-medium text-center leading-tight line-clamp-4">
                    {book.name}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  {book.name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 text-xs font-medium">
                    {book.category || "未分类"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium">
                    作者：{book.author || "佚名"}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    book.status === "完结"
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                  }`}>
                    {book.status || "连载中"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium">
                    共 {total} 章
                  </span>
                </div>
                {book.intro && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">
                    {book.intro}
                  </p>
                )}
                <button
                  type="button"
                  disabled={total === 0}
                  onClick={() => router.push(`/novel/${slug}/1`)}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  {total > 0 ? "开始阅读" : "暂无章节"}
                </button>
              </div>
            </div>
          </div>

          {/* 章节目录 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">目录</h2>
            {maxPage > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadChapters(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-40 hover:text-sky-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500">
                  {page} / {maxPage}
                </span>
                <button
                  type="button"
                  onClick={() => loadChapters(page + 1)}
                  disabled={page >= maxPage}
                  className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-40 hover:text-sky-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/novel/${slug}/${c.id}`)}
                  className="text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:text-sky-600 dark:hover:text-sky-400 transition-colors truncate"
                >
                  {c.title}
                </button>
              ))}
            </div>
            {chapters.length === 0 && (
              <p className="text-center py-10 text-slate-400 text-sm">暂无章节</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
