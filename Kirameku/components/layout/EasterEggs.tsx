"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { confetti, fallingPetals, burstAt, floatingToast, playLoveEgg, playKiramekuEgg } from "@/lib/easterEggs";
import { siteConfig } from "@/siteConfig";

/**
 * 全局彩蛋集合（纯前端，挂在 layout 里）。
 * 彩蛋清单：
 *  1) 键盘打出 love → 全屏流星 + 唤醒文案
 *  2) 凌晨 0~5 点 → 温柔问候 + 星空背景提示
 *  3) 看板娘连点 3 次 → 随机情话气泡
 *  4) 关于页头像双击 → 时间倒流动画 + 定格文案
 *  5) 生日当天 → 蛋糕 Logo + 彩纸 + 生日 toast
 *  6) 节日 → 情人节爱心雨 / 圣诞雪花（SeasonalEffect 已有冬季，这里只补爱心雨）
 */

const LOVE_WORDS = [
  "在星港的每一次相遇，都是引力在起作用 ✨",
  "你是我代码里唯一的常量，永远不会改变。",
  "穿越 5201314 光年，只为此刻遇见你。",
  "如果时间可以倒流，我仍会选择走向你。",
  "这个小站，因为你的来访而有了温度。",
  "宇宙那么大，能和你在这相遇，真好。",
];

const NIGHT_GREETINGS = [
  "这么晚还没睡，是有什么心事吗？🌙",
  "夜深了，星港还亮着灯，等你。⭐",
  "凌晨的风有点凉，记得加件外套。",
  "熬夜伤身体，看完这页就去睡吧。",
];

export default function EasterEggs() {
  const pathname = usePathname();
  const typed = useRef("");
  const logoClickTimes = useRef<number[]>([]);
  const live2dClickTimes = useRef<number[]>([]);

  // ── 彩蛋 6：键盘 love / yexianglun 触发 ──
  // 移动端没有物理键盘，同样的效果也可以从首页搜索框输入触发（见 SearchBar）。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 忽略输入框内的输入
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      typed.current += e.key.toLowerCase();
      if (typed.current.length > 24) typed.current = typed.current.slice(-24);
      if (typed.current.endsWith("love")) {
        typed.current = "";
        playLoveEgg();
      }
      if (typed.current.endsWith("yexianglun")) {
        typed.current = "";
        playKiramekuEgg();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── 彩蛋 2：凌晨问候 ──
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 0 && h < 5) {
      const msg = NIGHT_GREETINGS[Math.floor(Math.random() * NIGHT_GREETINGS.length)];
      const t = setTimeout(() => floatingToast(msg, { emoji: "🌙", duration: 5000 }), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  // ── 彩蛋 4：看板娘密语（监听 live2d 画布点击）──
  useEffect(() => {
    const handleLive2DClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // live2d 画布通常在 #live2dcanvas 或 canvas 元素，且位于右下角
      const isLive2D = target.id === "live2dcanvas" || (target.tagName === "CANVAS" && target.closest("#live2d") !== null) || target.closest?.("#live2d") !== null;
      if (!isLive2D) return;
      const now = Date.now();
      live2dClickTimes.current.push(now);
      live2dClickTimes.current = live2dClickTimes.current.filter((t) => now - t < 2500);
      if (live2dClickTimes.current.length >= 3) {
        live2dClickTimes.current = [];
        const word = LOVE_WORDS[Math.floor(Math.random() * LOVE_WORDS.length)];
        floatingToast(word, { emoji: "💬", duration: 4000, style: "max-width:80vw;text-align:center" });
      }
    };
    // live2d 是外链脚本异步注入的，用捕获阶段全局监听
    document.addEventListener("click", handleLive2DClick, true);
    return () => document.removeEventListener("click", handleLive2DClick, true);
  }, []);

  // ── 彩蛋 1：关于页头像双击 → 时间倒流 ──
  useEffect(() => {
    if (pathname !== "/about") return;

    const findAvatar = () => document.querySelector('img[alt="avatar"]') as HTMLElement | null;

    let lastTap = 0;
    let rewindLock = false;

    const triggerTimeRewind = () => {
      if (rewindLock) return; // 防重入：动画进行中不重复触发
      rewindLock = true;
      // 视觉：页面短暂反色/模糊
      const body = document.body;
      body.style.transition = "filter .6s ease";
      body.style.filter = "blur(1.5px) contrast(1.1)";
      floatingToast("⏳ 时间，正在倒流……", { emoji: "⏳", duration: 1500 });
      setTimeout(() => {
        body.style.filter = "";
        fallingPetals({ count: 40, color: ["#a78bfa", "#818cf8", "#c4b5fd", "#e0e7ff"], duration: 4500 });
        floatingToast("我找到了逆转时间的公式：把每一天都过成值得回看的样子 ✨", {
          emoji: "💫",
          duration: 6000,
          style: "max-width:85vw;text-align:center",
        });
      }, 1600);
      setTimeout(() => { rewindLock = false; }, 2500); // 2.5s 后解锁
    };

    // 统一用「两次 click 判定双击」，桌面/移动端通用，间隔放宽到 500ms
    const onTap = () => {
      const now = Date.now();
      if (now - lastTap < 500) {
        lastTap = 0;
        triggerTimeRewind();
      } else {
        lastTap = now;
      }
    };

    const attach = () => {
      const avatar = findAvatar();
      if (!avatar) return;
      avatar.style.cursor = "pointer";
      avatar.style.userSelect = "none";
      avatar.title = "双击有惊喜";
      avatar.addEventListener("click", onTap);
    };

    // about 页是 server 渲染，等待 DOM 就绪
    const t = setTimeout(attach, 500);
    return () => {
      clearTimeout(t);
      const avatar = findAvatar();
      if (avatar) {
        avatar.removeEventListener("click", onTap);
      }
    };
  }, [pathname]);

  // ── 彩蛋 3：生日彩蛋 ──
  useEffect(() => {
    const birthday = siteConfig.birthday;
    if (!birthday) return;
    const today = new Date();
    const bd = new Date(birthday);
    if (today.getMonth() === bd.getMonth() && today.getDate() === bd.getDate()) {
      const t = setTimeout(() => {
        confetti({ count: 350, waves: 4, shapes: [0, 1, 2, 3], colors: ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bd6", "#c084fc"] });
        floatingToast(`🎂 今天是 ${siteConfig.authorName} 的生日！祝 TA 生日快乐！`, { emoji: "🎂", duration: 6000 });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  // ── 彩蛋 8（补）：情人节爱心雨 ──
  useEffect(() => {
    const today = new Date();
    const isValentine = (today.getMonth() === 1 && today.getDate() === 14) || (today.getMonth() === 4 && today.getDate() === 20);
    if (isValentine) {
      const t = setTimeout(() => {
        fallingPetals({ count: 35, heart: true, color: ["#f472b6", "#ec4899", "#fda4af", "#fb7185"], duration: 6000 });
        floatingToast("❤️ 今天也要好好爱人，更要好好爱自己。", { emoji: "❤️", duration: 5000 });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  return null;
}
