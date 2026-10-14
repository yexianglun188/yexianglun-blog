import type { MetadataRoute } from "next";
import { siteConfig } from "@/siteConfig";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 后台与账号相关页面不收录
        disallow: ["/admin", "/login", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
