"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/siteConfig";

/**
 * 彩蛋 7：天气彩蛋
 * 默认关闭：只有 siteConfig.weatherCity 显式配置了城市才启用。
 * （自动定位版曾把阴/雾天画成全屏光斑盖住背景图，已回退——雾/晴/阴不做粒子。）
 * 支持天气：snow 雪 / rain 雨 / thunder 雷暴 / wind 大风
 * 真实效果：雨滴重力加速+地面溅落、雪花左右摆动、雷暴随机闪电、密度随雨量等级变化。
 */

type WeatherType = "snow" | "rain" | "thunder" | "wind";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  phase: number; speed: number;
  len: number;
}

const CODE_MAP: Record<string, WeatherType> = {
  "sn": "snow", "bl": "snow", "sw": "snow",
  "t": "thunder", "tt": "thunder",
  "ra": "rain", "rn": "rain", "sh": "rain", "sr": "rain", "sl": "rain",
  "ws": "wind",
};

function classify(weatherCode: string, weatherDesc: string): WeatherType | null {
  const code = weatherCode.trim().toLowerCase();
  if (CODE_MAP[code]) return CODE_MAP[code];

  const t = `${weatherCode} ${weatherDesc}`;
  if (/雪|snow|blizzard|sleet/i.test(t)) return "snow";
  if (/雷|thunder|storm|闪电/i.test(t)) return "thunder";
  if (/雨|rain|drizzle|shower/i.test(t)) return "rain";
  // 雾/霾/阴/多云/晴 故意不匹配 —— 这些天气做全屏粒子会污染背景视觉
  if (/大风|强风|wind|gale/i.test(t)) return "wind";
  return null;
}

function spawn(type: WeatherType, w: number, h: number): Particle {
  switch (type) {
    case "snow":
      return { x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0.4 + Math.random() * 0.8, size: 2 + Math.random() * 3, opacity: 0.4 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2, speed: 0.01 + Math.random() * 0.02, len: 0 };
    case "rain":
    case "thunder":
      return { x: Math.random() * w, y: Math.random() * h, vx: -1.5 + Math.random() * 1, vy: 4 + Math.random() * 6, size: 1, opacity: 0.3 + Math.random() * 0.3, phase: 0, speed: 0, len: 10 + Math.random() * 15 };
    case "wind":
      return { x: -20, y: Math.random() * h, vx: 3 + Math.random() * 4, vy: (Math.random() - 0.5) * 0.5, size: 3 + Math.random() * 5, opacity: 0.5 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2, speed: 0.02, len: 0 };
  }
}

function update(p: Particle, type: WeatherType, w: number, h: number, splashes: Particle[]) {
  switch (type) {
    case "snow":
      p.y += p.vy;
      p.x += Math.sin(p.y * p.speed + p.phase) * 0.6;
      if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
      break;
    case "rain":
    case "thunder":
      p.vy += 0.15;
      p.y += p.vy;
      p.x += p.vx;
      if (p.y > h + 20) {
        splashes.push({ x: p.x, y: h, vx: 0, vy: 0, size: 1 + Math.random() * 2, opacity: 0.5, phase: 0, speed: 0, len: 0 });
        p.y = -20; p.x = Math.random() * w; p.vy = 4 + Math.random() * 6;
      }
      break;
    case "wind":
      p.x += p.vx;
      p.y += p.vy + Math.sin(Date.now() * 0.01 + p.phase) * 0.4;
      if (p.x > w + 20) { p.x = -20; p.y = Math.random() * h; }
      break;
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle, type: WeatherType) {
  ctx.globalAlpha = p.opacity;
  switch (type) {
    case "snow":
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "rain":
    case "thunder":
      ctx.strokeStyle = "rgba(148,163,184,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx, p.y - p.len);
      ctx.stroke();
      break;
    case "wind":
      ctx.strokeStyle = "rgba(203,213,225,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + 8, p.y - 4, p.x + 16, p.y);
      ctx.stroke();
      break;
  }
  ctx.globalAlpha = 1;
}

export default function WeatherEffect() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const splashes = useRef<Particle[]>([]);
  const animFrame = useRef<number>(0);
  const [weather, setWeather] = useState<WeatherType | null>(null);
  const [intensity, setIntensity] = useState<number>(1);

  const city = siteConfig.weatherCity;
  // 默认关闭：只有显式配置了 weatherCity 才启用
  const disabled = pathname?.startsWith("/garden/") || !city;

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    fetch(`https://wttr.in/${encodeURIComponent(city!)}?format=%C+%c&lang=zh`, { signal: AbortSignal.timeout(8000) })
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const parts = text.trim().split(/\s+/);
        const w = classify(parts[0] || "", parts.slice(1).join(" ") || "");
        if (w) setWeather(w);
        const desc = parts.slice(1).join(" ") || "";
        if (/暴|大|heavy/i.test(desc)) setIntensity(3);
        else if (/中|moderate/i.test(desc)) setIntensity(2);
        else setIntensity(1);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [disabled, city]);

  useEffect(() => {
    if (disabled || !weather) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width;
    const H = () => canvas.height;
    const isMobile = window.innerWidth < 768;
    const base = isMobile ? 30 : 70;
    const count = Math.round(base * intensity);

    particles.current = [];
    splashes.current = [];
    for (let i = 0; i < count; i++) {
      particles.current.push(spawn(weather, W(), H()));
    }

    let lastLightning = 0;
    let lightningFlash = 0;

    const loop = () => {
      ctx.clearRect(0, 0, W(), H());

      if (weather === "thunder" && Date.now() - lastLightning > 3000 + Math.random() * 4000) {
        lastLightning = Date.now();
        lightningFlash = 6;
      }
      if (lightningFlash > 0) {
        lightningFlash--;
        ctx.fillStyle = `rgba(255,255,255,${lightningFlash / 12})`;
        ctx.fillRect(0, 0, W(), H());
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let lx = Math.random() * W();
        let ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < H() * 0.6) {
          lx += (Math.random() - 0.5) * 60;
          ly += 20 + Math.random() * 40;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }

      for (const p of particles.current) {
        update(p, weather, W(), H(), splashes.current);
        draw(ctx, p, weather);
      }

      if (weather === "rain" || weather === "thunder") {
        splashes.current = splashes.current.filter((s) => s.opacity > 0);
        for (const s of splashes.current) {
          s.y += 1;
          s.opacity -= 0.05;
          ctx.globalAlpha = Math.max(0, s.opacity);
          ctx.fillStyle = "rgba(148,163,184,0.5)";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      animFrame.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrame.current);
    };
  }, [disabled, weather, intensity]);

  if (disabled || !weather) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9996] pointer-events-none"
    />
  );
}
