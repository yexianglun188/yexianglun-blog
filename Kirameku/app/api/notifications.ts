import { request } from "./client";

export interface NotificationItem {
  type: "comment" | "chatter_comment" | "message";
  id: number;
  from_user: string;
  from_avatar: string;
  reply_content: string;
  parent_content: string;
  created_at: string;
}

export interface NotificationList {
  items: NotificationItem[];
  unread_count: number;
}

/** 获取「回复我的」通知列表（需登录） */
export function getNotifications(token: string) {
  return request<NotificationList>("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 获取未读数量 */
export function getUnreadCount(token: string) {
  return request<{ unread_count: number }>("/api/notifications/unread-count", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 标记全部已读 */
export function markNotificationsRead(token: string) {
  return request<{ ok: boolean }>("/api/notifications/read", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
