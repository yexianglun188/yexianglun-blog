"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit() {
    const q = value.trim();
    if (!q) return;
    // 保留原彩蛋：输入暗号解锁子站
    if (q === "5201314") {
      localStorage.setItem("garden-unlock", "true");
      router.push("/garden");
      setValue("");
      return;
    }
    // 彩蛋：摩斯密码 "-.- .. .-. .- -- . -.- ..-" = KIRAMEKU，解锁情书
    if (q === "-.- .. .-. .- -- . -.- ..-" || q.toLowerCase() === "kirameku") {
      localStorage.setItem("love-unlock", "true");
      router.push("/love");
      setValue("");
      return;
    }
    // 其余输入作为站内搜索关键词
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setValue("");
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 md:mb-10">
      <form
        className="relative group"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className="w-full pl-12 md:pl-14 pr-5 md:pr-6 py-3 md:py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl md:rounded-3xl shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 transition-all placeholder-slate-500 dark:placeholder-slate-400 font-medium text-base md:text-lg"
          placeholder="搜索文章，或输入暗号探索更多..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="absolute inset-y-0 left-0 pl-5 flex items-center z-10 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>
    </div>
  );
}
