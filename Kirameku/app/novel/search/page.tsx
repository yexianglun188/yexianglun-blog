"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { searchBooks, toSlug, type BookItem } from "@/app/api/novel/novel-api";
import BookCard, { EmptyState } from "../_lib/BookCard";
import LoadingTips from "../_lib/LoadingTips";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    searchBooks(query)
      .then((list) => {
        if (!alive) return;
        setResults(list);
      })
      .catch(() => alive && setError("搜索失败，请稍后重试"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12" style={{ maxWidth: "72rem" }}>
      <button
        type="button"
        onClick={() => router.push("/novel")}
        className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回书城
      </button>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        搜索结果：{query}
        {!loading && results.length > 0 && (
          <span className="text-sm font-normal text-slate-400 ml-3">共 {results.length} 条</span>
        )}
      </h2>

      {loading && <LoadingTips />}
      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((book, i) => (
            <motion.div
              key={book.bookUrl}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
            >
              <BookCard
                book={book}
                onClick={() => router.push(`/novel/${toSlug(book.bookUrl)}`)}
              />
            </motion.div>
          ))}
        </div>
      )}
      {!loading && !error && results.length === 0 && (
        <EmptyState text={`没有找到与「${query}」相关的小说`} />
      )}

      {!loading && !error && results.length > 0 && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={() => router.push("/novel")}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-600 dark:text-slate-400 hover:text-sky-500 transition-colors"
          >
            <Search className="w-4 h-4" /> 换个分类逛逛
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingTips />}>
      <SearchContent />
    </Suspense>
  );
}
