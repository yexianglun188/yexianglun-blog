"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fallingPetals, floatingToast } from "@/lib/easterEggs";
import FadeIn from "@/components/ui/FadeIn";
import { siteConfig } from "@/siteConfig";

/**
 * 彩蛋：藏在摩斯密码后面的信 /love
 *
 * 先在首页搜索框输入 "-.- .. .-. .- -- . -.- ..-"（KIRAMEKU）解锁，
 * 未解锁访问时只显示一句「这里什么都没有」式的提示，解锁后逐行浮现一封信。
 *
 * 文案全部来自 siteConfig.loveLetter，改内容不用动这个文件。
 */
export default function LovePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUnlocked(localStorage.getItem("love-unlock") === "true");
  }, []);

  const letter = siteConfig.loveLetter;
  const lines = letter.lines;
  // 逐行浮现的间隔：行多时自动压缩，保证整封信 4 秒左右浮完
  const lineDelay = Math.min(0.5, 4 / Math.max(lines.length, 1));

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
              {letter.lockedText}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-3">
              {letter.lockedTip}
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
                {letter.title}
              </h1>
            </div>
            <div className="space-y-4 text-center">
              {lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * lineDelay }}
                  className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg"
                >
                  {line}
                </motion.p>
              ))}
            </div>
            <div className="text-center mt-10">
              <button
                onClick={() => floatingToast(letter.buttonToast, { emoji: "💫", duration: 3000 })}
                className="px-6 py-2.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium"
              >
                {letter.button}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  );
}
