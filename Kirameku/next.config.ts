import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

  // 默认 .next；构建期若 WorkBuddy 的批量删除保护拦住了 Next 清理旧产物，
  // 可用 NEXT_DIST_DIR 指定一个全新目录构建（走 start 时也读同一变量）。
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),

  // 允许通过 cpolar 内网穿透域名访问 dev server
  // （Next.js 15.3+ 会拦截非 localhost 来源的 dev 请求）
  allowedDevOrigins: [
    "*.cpolar.cn",
    "*.cpolar.top",
    "*.cpolar.io",
    "*.vip.cpolar.cn",
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:8000/uploads/:path*",
      },
      {
        // 管理后台：Vue dist 挂载在后端 8000，通过前端 3000 转发，公网无需单独穿透 8000
        // 两条规则：/admin（无斜杠，Next 默认 trailingSlash=false 不会自动补）与 /admin/xxx
        source: "/admin",
        destination: "http://127.0.0.1:8000/admin/",
      },
      {
        source: "/admin/:path*",
        destination: "http://127.0.0.1:8000/admin/:path*",
      },
      // 小说数据改为自研后端 /api/novel（novel_crawler.py 抓取 quanben.io），
      // 不再需要 reader3(8085) 代理
    ];
  },

  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // 阿里云 OSS（后台图片压缩上传后回显用，按自己的 bucket 改）
      { protocol: "https", hostname: "*.aliyuncs.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "http", hostname: "wfqqreader-1252317822.image.myqcloud.com" },
    ],
  },
};

export default nextConfig;
