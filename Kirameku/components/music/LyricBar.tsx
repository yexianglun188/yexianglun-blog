"use client";

import { useState, useEffect, useRef } from "react";
import { useMusic } from "@/components/providers/MusicProvider";

export default function LyricBar() {
  const { isPlaying, currentLyric, currentSong, saying, refreshSaying } = useMusic();
  const [displayedText, setDisplayedText] = useState("");
  const prevTextRef = useRef("");
  const charRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 跑马灯状态：文字超出一行宽度时横向循环滚动（手机端屏幕窄，原来直接被 truncate 截断）
  const textWrapRef = useRef<HTMLParagraphElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [marquee, setMarquee] = useState<{ dist: number; duration: number } | null>(null);

  // Determine the target text: lyrics when playing, saying when paused
  const targetText = isPlaying ? currentLyric : saying;

  // Typewriter effect
  useEffect(() => {
    if (targetText === prevTextRef.current) return;
    prevTextRef.current = targetText;
    charRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText("");

    if (!targetText) return;
    intervalRef.current = setInterval(() => {
      charRef.current++;
      if (charRef.current <= targetText.length) {
        setDisplayedText(targetText.slice(0, charRef.current));
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [targetText]);

  // 打字机结束后（或窗口尺寸变化时）测量是否溢出，决定是否跑马灯
  const measureMarquee = () => {
    const p = textWrapRef.current;
    const box = boxRef.current;
    if (!p || !box) return;
    const dist = p.scrollWidth - box.clientWidth;
    if (dist > 8) {
      setMarquee((prev) =>
        prev && Math.abs(prev.dist - dist) < 4
          ? prev
          : { dist: dist + 16, duration: Math.max(8, Math.min(24, (dist + 16) / 28)) }
      );
    } else {
      setMarquee((prev) => (prev === null ? prev : null));
    }
  };

  useEffect(() => {
    measureMarquee();
    // 打字进行中每隔一段时间复测一次，打完自然收敛
    const t = setInterval(measureMarquee, 600);
    window.addEventListener("resize", measureMarquee);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", measureMarquee);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedText]);

  if (!currentSong) return null;

  const waves = [
    { color: "bg-indigo-400", delay: "0ms" },
    { color: "bg-purple-400", delay: "200ms" },
    { color: "bg-indigo-500", delay: "400ms" },
    { color: "bg-purple-500", delay: "100ms" },
    { color: "bg-indigo-300", delay: "300ms" },
  ];

  const shownText = displayedText || (isPlaying ? "♪ ♪" : saying || "暂无歌词，点击换一句");

  return (
    <>
      <style>{`
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-cursor { animation: cursorBlink 0.8s step-end infinite; }
        @keyframes safeWave { 0%, 100% { height: 8px; } 50% { height: 28px; } }
        .safe-wave-active { animation: safeWave 1s ease-in-out infinite; }
        /* 歌词跑马灯：滚到头停一会再滚回来，往复循环 */
        @keyframes lyricMarquee {
          0%   { transform: translateX(0); }
          42%  { transform: translateX(calc(-1 * var(--marquee-dist))); }
          50%  { transform: translateX(calc(-1 * var(--marquee-dist))); }
          92%  { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
        .lyric-marquee {
          animation: lyricMarquee var(--marquee-duration) linear infinite;
          will-change: transform;
        }
      `}</style>

      <div
        className="w-full rounded-3xl bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xl border border-white/10 shadow-2xl p-3 md:p-5 flex items-center justify-between transition-all duration-700 hover:shadow-indigo-500/20 group h-14 md:h-20"
        onClick={() => { if (!isPlaying && saying) refreshSaying(); }}
      >
        {/* Waveform */}
        <div className="flex items-end justify-center gap-[4px] h-8 w-10 md:w-16 shrink-0">
          {waves.map((wave, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-t-sm transition-all duration-500 ease-out ${
                isPlaying ? `${wave.color} safe-wave-active` : "h-1 bg-slate-600"
              }`}
              style={{ animationDelay: wave.delay, height: isPlaying ? undefined : "4px" }}
            />
          ))}
        </div>

        {/* Lyric / Saying：溢出时跑马灯轮播，否则居中静止 */}
        <div ref={boxRef} className="flex-1 min-w-0 px-3 md:px-8 flex justify-center items-center overflow-hidden">
          <p
            ref={textWrapRef}
            style={
              marquee
                ? ({
                    "--marquee-dist": `${marquee.dist}px`,
                    "--marquee-duration": `${marquee.duration}s`,
                  } as React.CSSProperties)
                : undefined
            }
            className={`text-white text-sm md:text-lg font-bold tracking-wider md:tracking-widest whitespace-nowrap drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] ${
              marquee ? "lyric-marquee" : ""
            }`}
          >
            {shownText}
            <span className="inline-block w-[3px] h-5 bg-indigo-400 align-middle ml-1 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-cursor" />
          </p>
        </div>

        {/* Music icon */}
        <div className="w-10 md:w-16 flex justify-end shrink-0">
          <svg
            className={`w-6 h-6 text-indigo-400/50 transition-all duration-500 ${isPlaying ? "animate-bounce" : "opacity-30"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
      </div>
    </>
  );
}
