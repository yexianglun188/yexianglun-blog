"use client";

import { useState } from "react";

/**
 * 音乐封面图（带降级）
 *
 * 为什么需要它：歌曲封面来自第三方 CDN（网易云 126.net / QQ y.gtimg.cn），
 * 可能出现 404、空串、防盗链失败等情况。直接用 <img src=""> 或坏链，
 * 浏览器会显示一个「裂图」小图标，在播放器和列表里非常难看。
 * 这里在加载失败或地址为空时，降级为渐变色块 + 音符图标。
 */
export default function CoverImg({
  src,
  alt = "",
  className = "",
  rounded = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-indigo-400 via-purple-400 to-sky-400 flex items-center justify-center overflow-hidden ${rounded} ${className}`}
        role="img"
        aria-label={alt || "封面"}
      >
        <svg className="w-1/3 h-1/3 text-white/80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}
