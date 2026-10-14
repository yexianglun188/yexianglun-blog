"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, List, Settings, Minus, Plus } from "lucide-react";
import { getChapterContent } from "@/app/api/novel/novel-api";
import { loadSettings, saveSettings, type ReadingSettings } from "../../_lib/utils";
import LoadingTips from "../../_lib/LoadingTips";

const THEMES: Record<string, { bg: string; text: string }> = {
  default: { bg: "bg-white/60 dark:bg-slate-800/60", text: "text-slate-800 dark:text-slate-200" },
  sepia: { bg: "bg-amber-50/80 dark:bg-amber-900/30", text: "text-amber-900 dark:text-amber-100" },
  green: { bg: "bg-emerald-50/80 dark:bg-emerald-900/30", text: "text-emerald-900 dark:text-emerald-400" },
};

export default function ReadingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.bookUrl as string) || "";
  const chapterId = Number(params.chapter) || 1;

  const [content, setContent] = useState<string[]>([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [prevId, setPrevId] = useState<number | null>(null);
  const [nextId, setNextId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    const onDown = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSettings]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    getChapterContent(slug, chapterId)
      .then((data) => {
        if (!alive) return;
        if (!data) {
          setError("章节加载失败");
          return;
        }
        setContent(data.content);
        setChapterTitle(data.title || `第 ${chapterId} 章`);
        setPrevId(data.prevId);
        setNextId(data.nextId);
        window.scrollTo({ top: 0 });
      })
      .catch(() => alive && setError("章节加载失败，请稍后重试"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug, chapterId]);

  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  const goChapter = (id: number | null) => {
    if (id) router.push(`/novel/${slug}/${id}`);
  };

  const s = settings;
  const theme = s ? THEMES[s.theme] || THEMES.default : THEMES.default;
  const width =
    s?.contentWidth === "narrow" ? "42rem"
    : s?.contentWidth === "wide" ? "72rem"
    : s?.contentWidth === "full" ? "100%"
    : "56rem";

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12" style={{ maxWidth: width }}>
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => router.push(`/novel/${slug}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-500"
        >
          <ArrowLeft className="w-4 h-4" /> 目录
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goChapter(prevId)}
            disabled={!prevId}
            title="上一章"
            className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-40 hover:text-sky-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 tabular-nums">第 {chapterId} 章</span>
          <button
            type="button"
            onClick={() => goChapter(nextId)}
            disabled={!nextId}
            title="下一章"
            className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-40 hover:text-sky-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            title="阅读设置"
            className={`p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors ${
              showSettings ? "bg-sky-500 text-white" : "bg-white/60 dark:bg-slate-800/60 text-slate-500 hover:text-sky-500"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && <LoadingTips />}
      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {!loading && !error && s && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-4 px-4">
            {chapterTitle}
          </h2>

          {/* 设置面板 */}
          {showSettings && (
            <div
              ref={settingsRef}
              className="absolute right-4 top-12 z-50 w-80 p-4 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-xl space-y-4"
            >
              <SettingRow label="字体大小">
                <Stepper
                  value={s.fontSize}
                  min={12}
                  max={32}
                  onChange={(v) => updateSetting("fontSize", v)}
                />
              </SettingRow>
              <SettingRow label="行距">
                <Stepper
                  value={s.lineHeight}
                  min={1.2}
                  max={3}
                  step={0.1}
                  digits={1}
                  onChange={(v) => updateSetting("lineHeight", v)}
                />
              </SettingRow>
              <SettingRow label="段距">
                <Stepper
                  value={s.paragraphSpacing}
                  min={0}
                  max={48}
                  step={4}
                  onChange={(v) => updateSetting("paragraphSpacing", v)}
                />
              </SettingRow>
              <SettingRow label="字体">
                <div className="flex gap-2">
                  {[["serif", "宋体"], ["sans-serif", "黑体"], ["system-ui", "系统"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => updateSetting("fontFamily", val)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        s.fontFamily === val
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="背景">
                <div className="flex gap-2">
                  {[["default", "默认"], ["sepia", "护眼"], ["green", "绿意"], ["custom", "自定义"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => updateSetting("theme", val)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        s.theme === val
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </SettingRow>
              {s.theme === "custom" && (
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="color"
                    aria-label="自定义背景色"
                    value={s.customColor}
                    onChange={(e) => updateSetting("customColor", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.customColor}</span>
                </div>
              )}
              <SettingRow label="宽度">
                <div className="flex gap-2">
                  {[["narrow", "窄"], ["normal", "标准"], ["wide", "宽"], ["full", "全屏"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => updateSetting("contentWidth", val)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        s.contentWidth === val
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>
          )}

          {/* 正文 */}
          <div
            className={`${s.theme === "custom" ? "" : theme.bg} backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-10`}
            style={s.theme === "custom" ? { backgroundColor: s.customColor } : undefined}
          >
            <div
              className={`${theme.text} max-w-none`}
              style={{
                fontSize: `${s.fontSize}px`,
                lineHeight: s.lineHeight,
                fontFamily: s.fontFamily,
              }}
            >
              {content.map((para, i) => (
                <p key={i} style={{ marginBottom: `${s.paragraphSpacing}px`, textIndent: "2em" }}>
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* 底部翻页 */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => goChapter(prevId)}
              disabled={!prevId}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-40 text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> 上一章
            </button>
            <button
              type="button"
              onClick={() => router.push(`/novel/${slug}`)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-500 hover:text-sky-500"
            >
              <List className="w-4 h-4" /> 目录
            </button>
            <button
              type="button"
              onClick={() => goChapter(nextId)}
              disabled={!nextId}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-40 text-sm"
            >
              下一章 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  digits = 0,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  digits?: number;
  onChange: (v: number) => void;
}) {
  const fmt = (v: number) => (digits ? v.toFixed(digits) : String(Math.round(v)));
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(digits)))}
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-sm w-10 text-center tabular-nums">{fmt(value)}</span>
      <button
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(digits)))}
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
