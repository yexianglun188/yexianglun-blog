"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench, Gift, ArrowRight } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";
import { useToast } from "@/components/providers/ToastProvider";

/**
 * 工具箱导航页：分类展示全站工具。
 * 点击工具 → 写入 toolbox-active-app → 跳首页 → 用户点右下角悬浮工具箱即弹出对应工具。
 */

interface ToolItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

interface ToolGroup {
  title: string;
  items: ToolItem[];
}

const GROUPS: ToolGroup[] = [
  {
    title: "热门资讯",
    items: [
      { id: "search", name: "智能搜索", emoji: "🔍", desc: "聚合搜索引擎" },
      { id: "hotboard", name: "全网热榜", emoji: "🔥", desc: "多平台热搜" },
      { id: "bilibilihot", name: "B站热榜", emoji: "📺", desc: "B站热门视频" },
      { id: "weather", name: "天气", emoji: "⛅", desc: "实时天气查询" },
      { id: "goldprice", name: "今日金价", emoji: "💰", desc: "黄金实时行情" },
      { id: "movieboxoffice", name: "实时票房", emoji: "🎬", desc: "电影票房排行" },
      { id: "douban", name: "豆瓣榜单", emoji: "⭐", desc: "电影/剧/书/音乐榜单" },
      { id: "githubuser", name: "GitHub用户", emoji: "👤", desc: "查 GitHub 用户" },
      { id: "githubrepo", name: "GitHub仓库", emoji: "📦", desc: "查 GitHub 仓库" },
      { id: "programmer-history", name: "程序员历史", emoji: "💻", desc: "程序员历史上的今天" },
      { id: "history", name: "历史今天", emoji: "📅", desc: "历史上的今天" },
    ],
  },
  {
    title: "趣味测试",
    items: [
      { id: "horoscope", name: "星座运势", emoji: "♈", desc: "今日星座运程" },
      { id: "guanyin", name: "观音灵签", emoji: "🙏", desc: "求签解签" },
      { id: "bmi", name: "BMI", emoji: "⚖️", desc: "身体质量指数" },
      { id: "jiakao", name: "驾考题库", emoji: "🚗", desc: "科目一题库" },
    ],
  },
  {
    title: "图片壁纸",
    items: [
      { id: "randomimage", name: "随机图片", emoji: "🖼️", desc: "随机美图" },
      { id: "genshin", name: "原神图片", emoji: "🎮", desc: "原神壁纸" },
      { id: "random4k", name: "4K图片", emoji: "🌄", desc: "高清壁纸" },
      { id: "fortune", name: "抽签", emoji: "🎋", desc: "随机抽签" },
    ],
  },
  {
    title: "娱乐互动",
    items: [
      { id: "games", name: "小游戏", emoji: "🕹️", desc: "18 个小游戏合集" },
      { id: "hitokoto", name: "一言", emoji: "💬", desc: "随机一句话" },
      { id: "dujitang", name: "毒鸡汤", emoji: "🍵", desc: "扎心语录" },
      { id: "dice", name: "骰子", emoji: "🎲", desc: "掷骰子" },
      { id: "coin", name: "硬币", emoji: "🪙", desc: "抛硬币" },
      { id: "rps", name: "猜拳", emoji: "✊", desc: "石头剪刀布" },
    ],
  },
  {
    title: "实用工具",
    items: [
      { id: "qrcode", name: "二维码", emoji: "🔳", desc: "生成二维码" },
      { id: "password", name: "密码", emoji: "🔑", desc: "密码生成器" },
      { id: "note", name: "记事本", emoji: "📝", desc: "随手记事" },
      { id: "converter", name: "换算", emoji: "📐", desc: "单位换算" },
      { id: "base", name: "进制", emoji: "🔢", desc: "进制转换" },
      { id: "calculator", name: "计算器", emoji: "🧮", desc: "科学计算器" },
      { id: "calendar", name: "日历", emoji: "📆", desc: "万年历" },
      { id: "tracking", name: "快递查询", emoji: "📦", desc: "快递追踪" },
      { id: "phoneinfo", name: "手机归属地", emoji: "📱", desc: "号码归属地" },
      { id: "worldtime", name: "世界时间", emoji: "🌍", desc: "全球时区" },
      { id: "clock", name: "时钟", emoji: "⏰", desc: "时钟/倒计时" },
    ],
  },
];

export default function ToolsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const openTool = (id: string) => {
    // 通过全局事件直接弹出对应工具（工具箱悬浮组件监听 open-toolbox）
    window.dispatchEvent(new CustomEvent("open-toolbox", { detail: id }));
    addToast("success", "工具已打开");
  };

  const openEggs = () => {
    router.push("/eggs");
  };

  return (
    <FadeIn className="w-full max-w-5xl mx-auto py-6 md:py-12 px-4 sm:px-6 relative z-10">
      {/* 头部 */}
      <div className="mb-6 md:mb-10">
        <div className="flex items-center gap-2 md:gap-3 mb-1">
          <Wrench className="w-5 h-5 md:w-7 md:h-7 text-sky-500" />
          <h1 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">工具箱</h1>
        </div>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 ml-7 md:ml-10">
          这里收纳了 {GROUPS.reduce((s, g) => s + g.items.length, 0)} 个实用小工具，点击即可使用
        </p>
      </div>

      {/* 彩蛋图鉴入口 */}
      <button
        onClick={openEggs}
        className="w-full mb-6 md:mb-8 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-rose-500/15 to-indigo-500/15 border border-rose-500/30 hover:border-rose-500/60 transition-colors flex items-center gap-3 group"
      >
        <Gift className="w-6 h-6 text-rose-500 shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">彩蛋图鉴</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">这个网站藏了 8 个隐藏彩蛋，看看你能找到几个？</p>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* 工具分组 */}
      {GROUPS.map((group) => (
        <div key={group.title} className="mb-6 md:mb-8">
          <h2 className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-sky-500" />
            {group.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
            {group.items.map((tool) => (
              <motion.button
                key={tool.id}
                onClick={() => openTool(tool.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="p-3 md:p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 hover:border-sky-500/40 transition-colors text-center"
              >
                <div className="text-2xl md:text-3xl mb-1.5">{tool.emoji}</div>
                <div className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {tool.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tool.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      {/* 底部提示 */}
      <p className="text-center text-[10px] md:text-xs text-slate-400 mt-4">
        小提示：点击任意工具卡片即可直接打开对应工具
      </p>
    </FadeIn>
  );
}
