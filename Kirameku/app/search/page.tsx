"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Loader2, FileX2 } from "lucide-react";
import PostCard, { type PostOut } from "@/components/posts/PostCard";
import { searchPosts } from "@/app/api/posts";

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [keyword, setKeyword] = useState(initialQ);
  const [results, setResults] = useState<PostOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = initialQ.trim();
    if (!q) return;
    let active = true;
    setLoading(true);
    searchPosts(q)
      .then((data) => {
        if (active) {
          setResults(data);
          setSearched(true);
        }
      })
      .catch(() => {
        if (active) setSearched(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialQ]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 w-full">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm md:text-base text-slate-500 hover:text-sky-500 transition-colors mb-4 md:mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
        返回首页
      </Link>

      <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
        <Search className="w-5 h-5 md:w-7 md:h-7 text-sky-500" />
        站内搜索
      </h1>

      <form onSubmit={handleSubmit} className="relative group mb-6 md:mb-10">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索文章标题、摘要、正文..."
          autoFocus
          className="w-full pl-12 pr-24 py-3 md:py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!keyword.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 md:py-2 rounded-xl bg-sky-500 text-white text-xs md:text-sm font-medium hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          搜索
        </button>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
      </form>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16 md:py-24 text-slate-400">
          <FileX2 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm md:text-base">
            没有找到与「{initialQ}」相关的文章
          </p>
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        {results.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <PostCard post={post} index={i} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
