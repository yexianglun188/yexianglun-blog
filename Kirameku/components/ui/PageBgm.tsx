"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 页面背景音乐。
 *
 * 行为：
 *  - 挂载即循环播放
 *  - **组件卸载（离开该页面）时立刻停止并释放音频**，不会串到别的页面去
 *  - 浏览器自动播放策略可能拦下首次播放，此时等用户第一次交互（点/按键）再补播
 *  - 右下角有个很轻的开关，方便随时静音
 *
 * 注意：不要在多个页面同时挂这个组件 —— 每个实例是独立的一份音频。
 */
export default function PageBgm({
  src,
  volume = 0.4,
  label = "背景音乐",
}: {
  src: string;
  volume?: number;
  label?: string;
}) {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!src) return;

    const el = new Audio(src);
    el.loop = true; // 循环播放
    el.preload = "auto";
    el.volume = volume;
    elRef.current = el;

    let cancelled = false;

    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.then(() => {
          if (cancelled) return;
          setPlaying(true);
          setBlocked(false);
        }).catch(() => {
          if (cancelled) return;
          // 被自动播放策略拦下：稍后由用户首次交互触发
          setPlaying(false);
          setBlocked(true);
        });
      } else {
        setPlaying(true);
      }
    };

    tryPlay();

    // 补播：等用户第一次点击或按键
    const onGesture = () => {
      if (!cancelled) tryPlay();
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);

    return () => {
      // 离开页面 → 立即停止并释放，保证不会在别的页面继续响
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      el.pause();
      el.removeAttribute("src");
      el.load(); // 让浏览器真正释放解码器
      elRef.current = null;
      setPlaying(false);
    };
  }, [src, volume]);

  const toggle = () => {
    const el = elRef.current;
    if (!el) return;
    if (el.paused) {
      setMuted(false);
      el.volume = volume;
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
      setMuted(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? `暂停${label}` : `播放${label}`}
      title={playing ? `暂停${label}` : blocked ? `点击播放${label}` : `播放${label}`}
      className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-10 h-10 rounded-full
                 flex items-center justify-center text-base
                 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl
                 border border-white/50 dark:border-white/10
                 shadow-lg shadow-rose-500/10
                 hover:scale-110 active:scale-95 transition-transform"
    >
      <span className={playing && !muted ? "animate-pulse" : ""}>
        {playing && !muted ? "🎵" : "🔇"}
      </span>
    </button>
  );
}
