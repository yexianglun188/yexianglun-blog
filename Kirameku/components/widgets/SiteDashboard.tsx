"use client";

import { useEffect, useState } from "react";

/**
 * 站点仪表盘（首页底部横条）
 *
 * 历史上这里还有「系统已稳定运行」计时和 ICP / 萌 ICP 备案链接，
 * 已按需求移除：备案号属于原模板作者，与本站无关，不宜继续展示。
 */
export default function SiteDashboard() {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="md:col-span-12 rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl overflow-hidden flex items-center justify-center transition-colors duration-700 h-auto md:h-20 group">
      <div className="bg-slate-900 dark:bg-black text-white px-10 py-4 md:py-0 flex items-center justify-center font-mono text-2xl md:text-3xl font-black tracking-widest shadow-inner relative overflow-hidden group-hover:text-indigo-400 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        {timeStr || "00:00:00"}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-black/50" />
      </div>
    </div>
  );
}
