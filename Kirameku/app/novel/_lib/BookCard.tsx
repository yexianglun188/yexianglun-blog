"use client";

import { BookOpen } from "lucide-react";
import type { BookItem } from "@/app/api/novel/novel-api";

/** 小说卡片：封面优先，失败/缺失时退化为书名色块 */
export default function BookCard({
  book,
  onClick,
}: {
  book: BookItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-700 cursor-pointer group"
    >
      <div className="p-5">
        <div className="flex gap-4">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.name}
              width={80}
              height={112}
              loading="lazy"
              className="rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-700"
            />
          ) : (
            <div className="w-20 h-28 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 p-1">
              <span className="text-white text-xs font-medium text-center leading-tight line-clamp-3">
                {book.name}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors truncate">
              {book.name}
            </h3>
            {book.author && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                {book.author}
              </p>
            )}
            {book.intro && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {book.intro}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-20 text-slate-400">
      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p>{text}</p>
    </div>
  );
}
