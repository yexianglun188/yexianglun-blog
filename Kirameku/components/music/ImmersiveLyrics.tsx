"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronUp, ChevronDown, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMusic } from "@/components/providers/MusicProvider";

/**
 * 全屏沉浸式歌词模式：类似 Folia 的招牌「全屏歌词动画」效果。
 * 暗色背景 + 大字歌词居中 + 当前句流光高亮，上下各展示前后一句（淡化）。
 * 完全自研，复用 MusicProvider 的歌词数据，无任何第三方依赖。
 */
export default function ImmersiveLyrics({ onClose }: { onClose: () => void }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    allLyrics,
    togglePlay,
    nextSong,
    prevSong,
  } = useMusic();

  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // 根据 currentTime 计算当前歌词索引
  useEffect(() => {
    if (!allLyrics.length) return;
    let idx = 0;
    for (let i = 0; i < allLyrics.length; i++) {
      if (currentTime >= allLyrics[i].time) idx = i;
      else break;
    }
    setActiveIndex(idx);
  }, [currentTime, allLyrics]);

  // 当前句自动滚动到中间
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    if (el && listRef.current) {
      const container = listRef.current;
      const target = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [activeIndex]);

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-2xl overflow-hidden"
      onClick={onClose}
    >
      {/* 背景：封面模糊 + 暗色遮罩 */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl scale-110"
        style={{ backgroundImage: currentSong.cover ? `url(${currentSong.cover})` : "none" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80" />

      {/* 顶部 */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {currentSong.cover && (
            <img
              src={currentSong.cover}
              alt=""
              className={`w-12 h-12 rounded-xl object-cover shadow-lg ${isPlaying ? "animate-[spin_12s_linear_infinite]" : ""}`}
              style={{ animationPlayState: isPlaying ? "running" : "paused" }}
            />
          )}
          <div>
            <p className="text-white font-semibold text-sm md:text-base leading-tight">
              {currentSong.title}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">{currentSong.artist}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
          title="退出全屏歌词"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 歌词主体 */}
      <div className="relative z-10 flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div ref={listRef} className="h-full overflow-y-auto px-6 py-[40vh] no-scrollbar">
          {allLyrics.length === 0 ? (
            <div className="text-center text-slate-400 text-lg">
              {currentSong.lrcUrl ? "暂无歌词" : "这首歌没有歌词~"}
            </div>
          ) : (
            allLyrics.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={i}
                  data-idx={i}
                  className={`transition-all duration-500 ease-out py-3 md:py-4 text-center select-none ${
                    isActive
                      ? "opacity-100 scale-110"
                      : i === activeIndex - 1 || i === activeIndex + 1
                        ? "opacity-40 scale-95"
                        : "opacity-15 scale-90"
                  }`}
                >
                  <span
                    className={`inline-block font-bold tracking-wide transition-colors duration-500 ${
                      isActive
                        ? "text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-sky-300 bg-[length:200%_100%] animate-[lyricShine_3s_linear_infinite] text-2xl md:text-4xl"
                        : "text-slate-300 text-lg md:text-2xl"
                    }`}
                  >
                    {line.text}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 底部：进度条 + 控制 */}
      <div className="relative z-10 px-6 pb-8 pt-2" onClick={(e) => e.stopPropagation()}>
        {/* 进度条 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-slate-400 text-xs tabular-nums w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-slate-400 text-xs tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center gap-8">
          <button type="button" onClick={prevSong} title="上一首" className="text-slate-300 hover:text-white transition-colors">
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? "暂停" : "播放"}
            className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-xl shadow-indigo-500/20"
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 translate-x-0.5" />}
          </button>
          <button type="button" onClick={() => nextSong()} title="下一首" className="text-slate-300 hover:text-white transition-colors">
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lyricShine {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}

function formatTime(s: number): string {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
