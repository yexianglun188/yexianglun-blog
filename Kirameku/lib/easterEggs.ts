"use client";

/**
 * 彩蛋通用工具：一次性 canvas 粒子动画（彩纸、流星、花瓣、心形雨等）。
 * 所有函数都会在指定画布上绘制，动画结束后自动移除画布，不产生内存泄漏。
 */

type ConfettiOpts = {
  /** 粒子总数 */
  count?: number;
  /** 发射波数（延迟错开） */
  waves?: number;
  /** 形状集合，0=矩形 1=圆 2=星 3=心 */
  shapes?: number[];
  /** 颜色集合 */
  colors?: string[];
  /** 生命周期帧数 */
  life?: number;
};

const DEFAULT_COLORS = [
  "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bd6",
  "#c084fc", "#fb923c", "#38bdf8", "#f472b6", "#fbbf24",
];

/** 全屏彩纸雨 */
export function confetti(opts: ConfettiOpts = {}) {
  const { count = 300, waves = 3, shapes = [0, 1, 2, 3], colors = DEFAULT_COLORS, life = 300 } = opts;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;

  const particles: {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; rotation: number; vr: number;
    gravity: number; opacity: number; shape: number; born: number;
  }[] = [];

  for (let wave = 0; wave < waves; wave++) {
    const delay = wave * 15;
    for (let i = 0; i < count / waves; i++) {
      particles.push({
        x: Math.random() * W,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        gravity: 0.05 + Math.random() * 0.05,
        opacity: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        born: delay,
      });
    }
  }

  let frame = 0;
  function drawHeart(ctx: CanvasRenderingContext2D, s: number) {
    ctx.beginPath();
    const topCurveHeight = s * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, topCurveHeight);
    ctx.bezierCurveTo(-s / 2, (s + topCurveHeight) / 2, 0, (s + topCurveHeight) / 1.3, 0, s);
    ctx.bezierCurveTo(0, (s + topCurveHeight) / 1.3, s / 2, (s + topCurveHeight) / 2, s / 2, topCurveHeight);
    ctx.bezierCurveTo(s / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of particles) {
      if (frame < p.born) { alive = true; continue; }
      const age = frame - p.born;
      p.x += p.vx + Math.sin(age * 0.02) * 0.5;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.998;
      p.rotation += p.vr;
      p.opacity = Math.max(0, 1 - age / life);
      if (p.opacity <= 0 || p.y > H + 20) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      if (p.shape === 0) {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 2) {
        const s = p.size / 2;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        drawHeart(ctx, p.size);
      }
      ctx.restore();
    }
    frame++;
    if (alive) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}

/** 全屏流星雨（从右上往左下划过） */
export function meteorShower(opts: { count?: number; duration?: number } = {}) {
  const { count = 40, duration = 4000 } = opts;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const start = performance.now();

  interface Meteor { x: number; y: number; len: number; speed: number; angle: number; opacity: number; delay: number; }
  const meteors: Meteor[] = [];
  for (let i = 0; i < count; i++) {
    meteors.push({
      x: Math.random() * W * 1.2,
      y: Math.random() * H * 0.5,
      len: 60 + Math.random() * 100,
      speed: 4 + Math.random() * 6,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      opacity: 0.4 + Math.random() * 0.6,
      delay: Math.random() * 1500,
    });
  }

  function animate(now: number) {
    ctx.clearRect(0, 0, W, H);
    const elapsed = now - start;
    for (const m of meteors) {
      if (elapsed < m.delay) continue;
      m.x -= Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      if (m.x < -m.len || m.y > H + m.len) {
        m.x = Math.random() * W * 1.2;
        m.y = Math.random() * H * 0.4;
        continue;
      }
      const tailX = m.x + Math.cos(m.angle) * m.len;
      const tailY = m.y - Math.sin(m.angle) * m.len;
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255,255,255,${m.opacity})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    if (elapsed < duration) requestAnimationFrame(animate);
    else canvas.remove();
  }
  requestAnimationFrame(animate);
}

/** 全屏花瓣/心形飘落 */
export function fallingPetals(opts: { count?: number; color?: string[]; heart?: boolean; duration?: number } = {}) {
  const { count = 30, color = ["#f9a8d4", "#f472b6", "#fbcfe8", "#ec4899", "#fce7f3"], heart = false, duration = 5000 } = opts;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const start = performance.now();

  interface Petal { x: number; y: number; size: number; speed: number; sway: number; swaySpeed: number; rotation: number; vr: number; color: string; phase: number; }
  const petals: Petal[] = [];
  for (let i = 0; i < count; i++) {
    petals.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 8 + Math.random() * 14,
      speed: 0.6 + Math.random() * 1.2,
      sway: Math.random() * 30,
      swaySpeed: 0.006 + Math.random() * 0.01,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.03,
      color: color[Math.floor(Math.random() * color.length)],
      phase: Math.random() * Math.PI * 2,
    });
  }

  function animate(now: number) {
    ctx.clearRect(0, 0, W, H);
    for (const p of petals) {
      p.y += p.speed;
      p.x += Math.sin(now * p.swaySpeed + p.phase) * 0.5;
      p.rotation += p.vr;
      if (p.y > H + 30) { p.y = -30; p.x = Math.random() * W; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = p.color;
      if (heart) {
        const s = p.size;
        const topCurveHeight = s * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, topCurveHeight);
        ctx.bezierCurveTo(-s / 2, (s + topCurveHeight) / 2, 0, (s + topCurveHeight) / 1.3, 0, s);
        ctx.bezierCurveTo(0, (s + topCurveHeight) / 1.3, s / 2, (s + topCurveHeight) / 2, s / 2, topCurveHeight);
        ctx.bezierCurveTo(s / 2, 0, 0, 0, 0, topCurveHeight);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size / 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (now - start < duration) requestAnimationFrame(animate);
    else canvas.remove();
  }
  requestAnimationFrame(animate);
}

/** 在指定位置爆炸出一圈粒子（用于点击反馈） */
export function burstAt(x: number, y: number, colors: string[] = DEFAULT_COLORS) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; opacity: number; life: number; }[] = [];
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      life: 40 + Math.random() * 30,
    });
  }
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
      p.opacity = Math.max(0, p.life / 70);
      if (p.life <= 0) continue;
      alive = true;
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    if (alive) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}

/** 轻量 toast 气泡（不依赖 React，直接插入 DOM） */
export function floatingToast(message: string, opts: { emoji?: string; duration?: number; style?: string } = {}) {
  const { emoji = "💫", duration = 3000, style = "" } = opts;
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; top:80px; left:50%; transform:translateX(-50%);
    z-index:100000; background:rgba(15,23,42,0.9); color:#fff;
    padding:12px 22px; border-radius:9999px; font-size:14px;
    box-shadow:0 10px 40px rgba(0,0,0,0.4); backdrop-filter:blur(8px);
    display:flex; align-items:center; gap:8px; animation:fadeSlideIn .4s ease;
    ${style}
  `;
  el.innerHTML = `<span style="font-size:18px">${emoji}</span><span>${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .4s, transform .4s";
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(-10px)";
    setTimeout(() => el.remove(), 400);
  }, duration);
}

/* ── 高层彩蛋触发器 ─────────────────────────────────────────────
 * 抽成独立函数是因为触发入口有两个：
 *   1) 桌面端：全局监听键盘输入（EasterEggs.tsx）
 *   2) 移动端：没有物理键盘，只能靠首页搜索框输入（SearchBar.tsx）
 * 两边共用同一套效果，避免各写一遍导致表现不一致。
 */

/** 彩蛋「键盘流星」：全屏流星雨 —— 输入 love */
export function playLoveEgg() {
  meteorShower({ count: 50, duration: 5000 });
  floatingToast("你唤醒了这颗星球 🌍", { emoji: "💫", duration: 3500 });
}

/** 彩蛋「闪耀吧」：星星彩纸 —— 输入 kirameku */
export function playKiramekuEgg() {
  confetti({
    count: 200,
    shapes: [2],
    colors: ["#a78bfa", "#67e8f9", "#f9a8d4", "#fde047"],
  });
  floatingToast("KIRAMEKU —— 闪耀吧 ✨", { emoji: "🌟", duration: 3500 });
}
