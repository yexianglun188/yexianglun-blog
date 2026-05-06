import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

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
      { protocol: "https", hostname: "static.hiromu.top" },
      { protocol: "https", hostname: "hiromu520.oss-cn-beijing.aliyuncs.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
