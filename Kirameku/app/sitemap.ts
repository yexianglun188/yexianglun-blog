import type { MetadataRoute } from "next";
import { siteConfig } from "@/siteConfig";

export const revalidate = 3600;

const BACKEND_URL = "http://127.0.0.1:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/posts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/moments`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/messages`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/photowall`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/timeline`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/projects`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/tools`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/eggs`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/bookmark`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/music`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/novel`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const res = await fetch(`${BACKEND_URL}/api/posts?status=published&size=200`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticRoutes;
    const posts: { slug: string; updated_at: string | null }[] = await res.json();
    const postRoutes: MetadataRoute.Sitemap = posts
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${base}/posts/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    return [...staticRoutes, ...postRoutes];
  } catch {
    // 后端不可用时至少保证静态路由的 sitemap 可用
    return staticRoutes;
  }
}
