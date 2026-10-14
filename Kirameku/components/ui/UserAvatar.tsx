"use client";

import Image from "next/image";

export interface AvatarUser {
  nickname?: string | null;
  username?: string | null;
  avatar?: string | null;
}

/** 统一头像：有头像地址走图片，没有则用昵称首字生成渐变色块 */
export default function UserAvatar({
  user,
  size = 28,
  className = "",
}: {
  user?: AvatarUser | null;
  size?: number;
  className?: string;
}) {
  const name = (user?.nickname || user?.username || "?").trim() || "?";

  if (user?.avatar) {
    return (
      <Image
        src={user.avatar}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.45) }}
      className={`rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-bold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
