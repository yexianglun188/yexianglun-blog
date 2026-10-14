/**
 * 小说 API 客户端（对接自研后端 /api/novel）
 * 数据源为后端 novel_crawler.py 抓取的 quanben.io，不再依赖 reader3(8085)
 */

export interface CategoryItem {
  key: string;
  name: string;
}

export interface BookItem {
  bookUrl: string;
  name: string;
  author: string;
  intro?: string;
  coverUrl?: string;
}

export interface BookDetail {
  bookUrl: string;
  name: string;
  author: string;
  category: string;
  status: string;
  coverUrl: string;
  intro: string;
}

export interface ChapterItem {
  id: number;
  title: string;
}

export interface ChapterContent {
  bookUrl: string;
  id: number;
  title: string;
  content: string[];
  prevId: number | null;
  nextId: number | null;
}

interface ApiResp<T> {
  isSuccess: boolean;
  data: T;
  errorMsg?: string;
}

const BASE = "/api/novel";

async function get<T>(path: string): Promise<ApiResp<T>> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/** 从 "/n/xianni" 或 "n/xianni" 中取出 slug "xianni" */
export function toSlug(bookUrl: string): string {
  const m = /\/?n\/([a-z0-9]+)\/?/.exec(bookUrl || "");
  return m ? m[1] : (bookUrl || "").replace(/^\/+|\/+$/g, "");
}

export async function getCategories(): Promise<CategoryItem[]> {
  const r = await get<CategoryItem[]>("/categories");
  return r.isSuccess ? r.data : [];
}

export async function getBooks(category: string, page = 1, refresh = false) {
  const r = await get<{
    category: string;
    page: number;
    pageSize: number;
    totalPages: number;
    total: number;
    list: BookItem[];
  }>(`/books?category=${encodeURIComponent(category)}&page=${page}${refresh ? "&refresh=true" : ""}`);
  return r.isSuccess
    ? r.data
    : { category, page, pageSize: 12, totalPages: 1, total: 0, list: [] as BookItem[] };
}

export async function searchBooks(key: string): Promise<BookItem[]> {
  const r = await get<BookItem[]>(`/search?key=${encodeURIComponent(key)}`);
  return r.isSuccess ? r.data : [];
}

export async function getBook(slug: string): Promise<BookDetail | null> {
  const r = await get<BookDetail>(`/book/${toSlug(slug)}`);
  return r.isSuccess ? r.data : null;
}

export async function getChapters(slug: string, page = 1, size = 100) {
  const r = await get<{ bookUrl: string; total: number; page: number; size: number; list: ChapterItem[] }>(
    `/chapters/${toSlug(slug)}?page=${page}&size=${size}`
  );
  return r.isSuccess ? r.data : { bookUrl: slug, total: 0, page, size, list: [] as ChapterItem[] };
}

export async function getChapterContent(slug: string, id: number): Promise<ChapterContent | null> {
  const r = await get<ChapterContent>(`/chapter/${toSlug(slug)}/${id}`);
  return r.isSuccess ? r.data : null;
}
