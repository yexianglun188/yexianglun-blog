"use client";

/** 阅读设置持久化（章节正文页复用） */

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  theme: string;
  customColor: string;
  contentWidth: string;
}

export const READING_SETTINGS_KEY = "novel_reading_settings";

export const defaultSettings: ReadingSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  paragraphSpacing: 16,
  fontFamily: "serif",
  theme: "default",
  customColor: "#f5f0e8",
  contentWidth: "normal",
};

export function loadSettings(): ReadingSettings {
  if (typeof window === "undefined") return defaultSettings;
  const saved = localStorage.getItem(READING_SETTINGS_KEY);
  if (saved) {
    try {
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
  }
  return defaultSettings;
}

export function saveSettings(s: ReadingSettings) {
  localStorage.setItem(READING_SETTINGS_KEY, JSON.stringify(s));
}
