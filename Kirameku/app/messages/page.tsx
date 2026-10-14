"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  Heart,
  MessageCircle,
  Send,
  LogOut,
  Reply,
  ChevronDown,
  ChevronUp,
  LogIn,
  UserPlus,
} from "lucide-react";

import {
  getMessages,
  createMessage,
  likeMessage,
  type MessageItem,
} from "@/app/api/messages";
import { displayName as authorName, avatarOf } from "@/app/api/types";
import { useAuth } from "@/components/providers/AuthProvider";
import UserAvatar from "@/components/ui/UserAvatar";
import MessageDanmaku from "@/components/messages/MessageDanmaku";

// 递归展平嵌套回复，附带"回复谁"信息
function flattenReplies(
  replies: MessageItem[],
  parentMap?: Map<number, string>
): (MessageItem & { replyToUser?: string })[] {
  const map = parentMap ?? new Map<number, string>();
  const result: (MessageItem & { replyToUser?: string })[] = [];
  for (const r of replies) {
    const replyToUser = map.get(r.parent_id!);
    result.push(replyToUser ? { ...r, replyToUser } : r);
    if (r.replies?.length) {
      map.set(r.id, authorName(r));
      result.push(...flattenReplies(r.replies, map));
    }
  }
  return result;
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days >= 3) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

export default function MessagesPage() {
  const { user, token, ready, canComment, logout } = useAuth();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = localStorage.getItem("liked_messages");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    new Set()
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 加载留言
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getMessages({ page: 1, size: 50 });
        if (!active) return;
        setMessages(data);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit() {
    if (!inputValue.trim() || submitting) return;
    if (!canComment) return;
    setSubmitting(true);
    try {
      const newMsg = await createMessage(
        {
          content: inputValue.trim(),
          parent_id: replyTo?.id,
        },
        token
      );
      if (replyTo) {
        // 回复：找到顶层父留言，添加到其 replies
        function findTopLevelId(msgs: MessageItem[], targetId: number): number | null {
          for (const m of msgs) {
            if (m.id === targetId) return m.id;
            for (const r of m.replies ?? []) {
              if (r.id === targetId) return m.id;
              // 二级嵌套
              for (const rr of r.replies ?? []) {
                if (rr.id === targetId) return m.id;
              }
            }
          }
          return null;
        }
        const parentId = findTopLevelId(messages, replyTo.id) ?? replyTo.id;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === parentId
              ? { ...m, replies: [...m.replies, newMsg] }
              : m
          )
        );
        setExpandedReplies((prev) => new Set([...prev, parentId]));
      } else {
        // 新留言：添加到顶部
        setMessages((prev) => [newMsg, ...prev]);
      }
      setInputValue("");
      setReplyTo(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "发送失败";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(msgId: number) {
    const alreadyLiked = likedIds.has(msgId);
    try {
      const updated = await likeMessage(msgId, alreadyLiked);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (alreadyLiked) next.delete(msgId);
        else next.add(msgId);
        localStorage.setItem("liked_messages", JSON.stringify([...next]));
        return next;
      });
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) return { ...m, likes: updated.likes };
          return {
            ...m,
            replies: m.replies.map((r) =>
              r.id === msgId ? { ...r, likes: updated.likes } : r
            ),
          };
        })
      );
    } catch {
      // ignore
    }
  }

  function toggleReplies(msgId: number) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  function startReply(msg: MessageItem) {
    setReplyTo(msg);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function cancelReply() {
    setReplyTo(null);
    setInputValue("");
  }

  const placeholder = !ready
    ? "加载中..."
    : !user
      ? "登录后即可留言..."
      : user.isGuest
        ? "访客不能留言，注册账号后即可发言"
        : replyTo
          ? "写下你的回复..."
          : "说点什么吧...";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-12">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 md:mb-10"
      >
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <Newspaper className="w-5 h-5 md:w-7 md:h-7 text-sky-500" />
          <h1 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            留言
          </h1>
        </div>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 ml-7 md:ml-10">
          注册账号，留下你的足迹
        </p>
      </motion.div>

      {/* 留言弹幕 */}
      <MessageDanmaku messages={messages} />

      {/* 登录 / 用户信息 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-4 md:mb-8"
      >
        {!ready ? (
          <div className="h-14 rounded-2xl bg-white/50 dark:bg-slate-800/60 animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-3 rounded-2xl bg-white/50 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-white/10">
            <UserAvatar user={user} size={32} className="md:w-9 md:h-9" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.nickname}
                </span>
                {user.isGuest && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    访客
                  </span>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.isGuest
                  ? "访客可以浏览，但不能留言"
                  : `@${user.username}`}
              </p>
            </div>
            {user.isGuest && (
              <Link
                href="/login?tab=register&redirect=/messages"
                className="flex items-center gap-1 text-[10px] md:text-xs text-sky-600 dark:text-sky-400 hover:underline px-1.5 md:px-2 py-0.5 md:py-1"
              >
                <UserPlus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                注册
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-3 h-3 md:w-3.5 md:h-3.5" />
              退出
            </button>
          </div>
        ) : (
          <Link
            href="/login?redirect=/messages"
            className="flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-3 rounded-2xl bg-white/50 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-white/10 hover:border-sky-400/50 transition-all group w-full"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
              <LogIn className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <div className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                登录 / 注册
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                登录后即可留言和回复，也可以「以访客身份浏览」
              </div>
            </div>
          </Link>
        )}
      </motion.div>

      {/* 输入框 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-5 md:mb-10"
      >
        <div className="rounded-2xl bg-white/50 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-white/10 overflow-hidden">
          {/* 访客提示 */}
          {ready && user?.isGuest && (
            <div className="px-3 py-2 md:px-5 md:py-2.5 text-[11px] md:text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-b border-amber-200/50 dark:border-amber-500/20">
              你当前是访客身份，只能浏览留言。
              <Link
                href="/login?tab=register&redirect=/messages"
                className="underline font-medium ml-1"
              >
                注册账号
              </Link>{" "}
              后即可留言。
            </div>
          )}

          {/* 回复提示 */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 md:gap-2 px-3 pt-2 md:px-5 md:pt-3 pb-0 text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                  <Reply className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>
                    回复{" "}
                    <span className="font-medium text-sky-600 dark:text-sky-400">
                      {authorName(replyTo)}
                    </span>
                  </span>
                  <span className="truncate flex-1 opacity-60">
                    {replyTo.content.slice(0, 50)}
                  </span>
                  <button
                    type="button"
                    onClick={cancelReply}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-1 md:ml-2"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 md:p-4">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              disabled={!canComment}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
              className="w-full bg-transparent text-xs md:text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-2 pt-2 md:mt-3 md:pt-3 border-t border-slate-200/50 dark:border-white/5">
              <span className="text-[10px] md:text-xs text-slate-400">
                {canComment ? "Ctrl + Enter 发送" : "登录后才能发送"}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canComment || !inputValue.trim() || submitting}
                className="flex items-center gap-1 md:gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-sky-500 text-white text-[10px] md:text-xs font-medium hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3 h-3 md:w-3.5 md:h-3.5" />
                {submitting ? "发送中..." : replyTo ? "回复" : "发送"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 空状态 */}
      {!loading && messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 md:py-20 text-slate-400"
        >
          <Newspaper className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-40" />
          <p className="text-sm md:text-base">还没有留言，来抢沙发吧~</p>
        </motion.div>
      )}

      {/* 留言列表 */}
      <div className="space-y-3 md:space-y-5">
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            <MessageCard
              msg={msg}
              likedIds={likedIds}
              expandedReplies={expandedReplies}
              onLike={handleLike}
              onReply={startReply}
              onToggleReplies={toggleReplies}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MessageCard({
  msg,
  likedIds,
  expandedReplies,
  onLike,
  onReply,
  onToggleReplies,
}: {
  msg: MessageItem;
  likedIds: Set<number>;
  expandedReplies: Set<number>;
  onLike: (id: number) => void;
  onReply: (msg: MessageItem) => void;
  onToggleReplies: (id: number) => void;
}) {
  const isExpanded = expandedReplies.has(msg.id);
  const flatReplies = flattenReplies(msg.replies ?? []);
  const replyCount = flatReplies.length;

  return (
    <div className="rounded-2xl bg-white/50 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-3 md:p-5">
        {/* 用户信息 */}
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <UserAvatar
            user={avatarOf(msg)}
            size={32}
            className="md:w-9 md:h-9"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {authorName(msg)}
              </span>
              {msg.user?.is_guest && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  访客
                </span>
              )}
            </div>
            {(msg.user?.nickname || msg.github_user?.bio) && (
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                {msg.github_user?.bio || `@${msg.user?.username}`}
              </p>
            )}
          </div>
          <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 shrink-0">
            {relativeTime(msg.created_at)}
          </span>
        </div>

        {/* 内容 */}
        <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mb-3 md:mb-4">
          {msg.content}
        </p>

        {/* 操作栏 */}
        <div className="flex items-center gap-2 md:gap-4 pt-2 md:pt-3 border-t border-slate-200/50 dark:border-white/5">
          <button
            type="button"
            onClick={() => onLike(msg.id)}
            className={`flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs transition-colors ${
              likedIds.has(msg.id)
                ? "text-pink-500"
                : "text-slate-400 hover:text-pink-500"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-all duration-300 ${
                likedIds.has(msg.id) ? "fill-pink-500 scale-110" : ""
              }`}
            />
            <span>{msg.likes}</span>
          </button>

          <button
            type="button"
            onClick={() => onReply(msg)}
            className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-slate-400 hover:text-sky-500 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>回复</span>
          </button>

          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => onToggleReplies(msg.id)}
              className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-slate-400 hover:text-blue-500 transition-colors ml-auto"
            >
              {isExpanded ? (
                <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
              ) : (
                <ChevronDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
              )}
              <span>
                {replyCount} 条回复
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 回复列表 */}
      <AnimatePresence>
        {isExpanded && replyCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30">
              {flatReplies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  likedIds={likedIds}
                  onLike={onLike}
                  onReply={onReply}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReplyCard({
  reply,
  likedIds,
  onLike,
  onReply,
}: {
  reply: MessageItem & { replyToUser?: string };
  likedIds: Set<number>;
  onLike: (id: number) => void;
  onReply: (msg: MessageItem) => void;
}) {
  return (
    <div className="px-3 py-2 md:px-5 md:py-3 border-b border-slate-200/30 dark:border-white/5 last:border-0">
      <div className="flex items-start gap-2 md:gap-3">
        <UserAvatar
          user={avatarOf(reply)}
          size={24}
          className="mt-0.5 md:w-7 md:h-7"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
            <span className="text-[10px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
              {authorName(reply)}
            </span>
            <span className="text-[10px] md:text-xs text-slate-400">
              {relativeTime(reply.created_at)}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
            {reply.replyToUser && (
              <span className="text-sky-500 dark:text-sky-400 mr-1">
                回复 @{reply.replyToUser}：
              </span>
            )}
            {reply.content}
          </p>
          <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2">
            <button
              type="button"
              onClick={() => onLike(reply.id)}
              className={`flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs transition-colors ${
                likedIds.has(reply.id)
                  ? "text-pink-500"
                  : "text-slate-400 hover:text-pink-500"
              }`}
            >
              <Heart
                className={`w-3 h-3 md:w-3.5 md:h-3.5 ${
                  likedIds.has(reply.id) ? "fill-pink-500" : ""
                }`}
              />
              <span>{reply.likes}</span>
            </button>
            <button
              type="button"
              onClick={() => onReply(reply)}
              className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs text-slate-400 hover:text-sky-500 transition-colors"
            >
              <Reply className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span>回复</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
