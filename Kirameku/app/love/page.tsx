"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fallingPetals, floatingToast } from "@/lib/easterEggs";
import FadeIn from "@/components/ui/FadeIn";

/**
 * 彩蛋：藏宝式情书页 /love
 * 需要先在搜索框输入摩斯密码 "-.- .. .-. .- -- . -.- ..-"（KIRAMEKU）解锁，
 * 未解锁访问时显示「这里什么都没有」，解锁后逐字浮现一封信。
 */
export default function LovePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUnlocked(localStorage.getItem("love-unlock") === "true");
  }, []);

  const lines = [
    "致此刻看到这封信的你：",
    "谢谢你愿意为一个藏在代码里的谜题，",
    "耐心地走到这里。",
    "这个网站叫 Kirameku —— 日语「煌めく」，",
    "意思是「闪耀、熠熠生辉」。",
    "愿你我的每一天，都能像这名字一样，",
    "在平凡里，发一点光。",
    "—— 一个还在努力长大的开发者",
  ];

  useEffect(() => {
    if (unlocked && mounted) {
      fallingPetals({ count: 30, heart: true, color: ["#f9a8d4", "#f472b6", "#fbcfe8", "#ec4899"], duration: 5000 });
    }
  }, [unlocked, mounted]);

  if (!mounted) return null;

  return (
    <FadeIn className="w-full max-w-2xl mx-auto py-12 px-6 relative z-10">
      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-6">🔒</div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              这里什么都没有，也许你还没有找到那把钥匙。
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-3">
              提示：答案就藏在我关于页的最后一行。
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 p-8 md:p-12"
          >
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">💌</div>
              <h1 className="text-2xl md:text-3xl font-black text-rose-500 dark:text-rose-400">
                你找到了这封信
              </h1>
            </div>
            <div className="space-y-4 text-center">
              {lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.5 }}
                  className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg"
                >
                  {line}
                </motion.p>
              ))}
            </div>
            <div className="text-center mt-10">
              <button
                onClick={() => floatingToast("这封信，会一直在这里等你 💫", { emoji: "💫", duration: 3000 })}
                className="px-6 py-2.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium"
              >
                回赠一颗星 ✨
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  );
}
