"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, Search } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

/**
 * 彩蛋图鉴页：列出本站所有隐藏彩蛋的触发方式。
 * 支持「已发现」勾选，进度存 localStorage，给访客一个收集目标。
 */

interface Egg {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  trigger: string;
  where: string;
}

const EGGS: Egg[] = [
  { id: "garden", emoji: "🌌", name: "星港子站", desc: "隐藏的数据仪表盘 + 18 个创意工具", trigger: "首页搜索框输入 5201314", where: "首页" },
  { id: "time", emoji: "⏳", name: "时间倒流", desc: "页面倒流 + 紫色花瓣雨", trigger: "关于页头像双击", where: "关于页" },
  { id: "confetti", emoji: "🎉", name: "Logo 彩纸", desc: "全屏彩纸 + 彩虹字", trigger: "2 秒内连点导航栏 Logo 7 次", where: "任意页" },
  { id: "love", emoji: "🌠", name: "键盘流星", desc: "全屏流星雨", trigger: "键盘打出 love，或首页搜索框输入 love", where: "任意页 / 首页" },
  { id: "kirameku", emoji: "🌟", name: "闪耀吧", desc: "星星彩纸", trigger: "键盘打出 kirameku，或首页搜索框输入 kirameku", where: "任意页 / 首页" },
  { id: "letter", emoji: "💌", name: "藏宝情书", desc: "一封给有缘人的信", trigger: "搜索框输入摩斯密码 -.- .. .-. .- -- . -.- ..-", where: "首页" },
  { id: "night", emoji: "🌙", name: "凌晨问候", desc: "深夜访问的温柔问候", trigger: "凌晨 0~5 点访问", where: "自动触发" },
  { id: "waifu", emoji: "💬", name: "看板娘密语", desc: "随机情话", trigger: "连点看板娘 3 次", where: "任意页" },
];

export default function EggsPage() {
  const [found, setFound] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("eggs-found");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggle = (id: string) => {
    setFound((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("eggs-found", JSON.stringify([...next]));
      return next;
    });
  };

  const progress = Math.round((found.size / EGGS.length) * 100);

  return (
    <FadeIn className="w-full max-w-4xl mx-auto py-6 md:py-12 px-4 sm:px-6 relative z-10">
      {/* 头部 */}
      <div className="mb-6 md:mb-10">
        <div className="flex items-center gap-2 md:gap-3 mb-1">
          <Gift className="w-5 h-5 md:w-7 md:h-7 text-rose-500" />
          <h1 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">彩蛋图鉴</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 ml-7 md:ml-10">
          这个小站藏了 {EGGS.length} 个彩蛋，你找到了几个？
        </p>
      </div>

      {/* 收集进度 */}
      <div className="mb-6 md:mb-8 p-4 md:p-5 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200">
            已发现 {found.size} / {EGGS.length}
          </span>
          <span className="text-xs font-bold text-rose-500">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200/60 dark:bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-indigo-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 彩蛋列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {EGGS.map((egg) => {
          const isFound = found.has(egg.id);
          return (
            <motion.button
              key={egg.id}
              onClick={() => toggle(egg.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-4 md:p-5 rounded-2xl border transition-colors duration-300 ${
                isFound
                  ? "bg-rose-500/10 border-rose-500/30"
                  : "bg-white/50 dark:bg-slate-800/50 border-white/40 dark:border-white/10 hover:border-rose-500/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl md:text-3xl shrink-0">{egg.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                      {egg.name}
                    </h3>
                    {isFound && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white shrink-0">
                        已发现
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{egg.desc}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-100/60 dark:bg-slate-700/40 rounded-lg px-2 py-1.5 inline-block">
                    怎么触发：{egg.trigger}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 彩蛋线索提示 */}
      <div className="mt-6 md:mt-8 p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-dashed border-slate-300/60 dark:border-white/10 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          还有隐藏的彩蛋没写进图鉴——试着多点点、多看看，也许会有惊喜。
        </p>
      </div>
    </FadeIn>
  );
}
