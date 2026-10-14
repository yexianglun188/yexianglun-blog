"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getNotifications, getUnreadCount, markNotificationsRead, type NotificationItem } from "@/app/api/notifications";

const TYPE_LABEL: Record<string, string> = {
  comment: "回复了你的文章评论",
  chatter_comment: "回复了你的说说评论",
  message: "回复了你的留言",
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

export default function NotificationBell() {
  const { user, token } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    if (!token) return;
    getUnreadCount(token)
      .then((d) => setUnread(d.unread_count))
      .catch(() => {});
  }, [token]);

  // 只有注册用户才有通知（访客禁言，无回复）
  useEffect(() => {
    if (!user || user.isGuest) return;
    fetchData();
    // 每 30s 轮询一次未读数
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [user, token, fetchData]);

  // 点击外部关闭
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openPanel = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      // 展开时拉取列表
      try {
        const d = await getNotifications(token);
        setItems(d.items);
        setUnread(d.unread_count);
      } catch {}
    }
  };

  const handleMarkRead = async () => {
    try {
      await markNotificationsRead(token);
      setUnread(0);
    } catch {}
  };

  if (!user || user.isGuest) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPanel}
        title="通知"
        className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-80 max-w-[85vw] glass-card p-2 z-50 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-slate-200/50 dark:border-white/10">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                回复我的
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkRead}
                  className="text-[10px] text-sky-500 hover:text-sky-600 transition-colors"
                >
                  全部已读
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="px-2 py-8 text-center text-xs text-slate-400">
                还没有人回复你，去留个言吧~
              </div>
            ) : (
              items.slice(0, 30).map((n) => (
                <div
                  key={`${n.type}-${n.id}`}
                  className="px-2 py-2.5 rounded-lg hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {n.from_avatar ? (
                        <img src={n.from_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        n.from_user[0]
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                        <span className="font-semibold">{n.from_user}</span>{" "}
                        <span className="text-slate-400">{TYPE_LABEL[n.type] ?? "回复了你"}</span>
                      </p>
                      {n.parent_content && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          「{n.parent_content}」
                        </p>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                        {n.reply_content}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
