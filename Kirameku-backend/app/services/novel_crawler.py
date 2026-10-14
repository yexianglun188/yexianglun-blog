"""小说爬虫服务（quanben.io 全本小说网）

替代原先依赖的外部 reader3 / reader-master 服务（端口 8085，本地未部署，
导致 /novel 全站 500）。本模块用 httpx 直接抓取公开免费小说站点：

  分类页   https://www.quanben.io/c/{key}.html
  搜索     https://www.quanben.io/index.php?c=book&a=search&keywords=xxx
  书籍详情 https://www.quanben.io/n/{slug}/            （og meta 带分类/作者/状态）
  章节目录 https://www.quanben.io/n/{slug}/list.html
  章节正文 https://www.quanben.io/n/{slug}/{id}.html   （正文在 #content 的 <p> 里）

设计要点：
  - 纯 stdlib re 解析，不引 BeautifulSoup，减少依赖
  - 内存 TTL 缓存（分类/详情/目录/搜索），避免重复抓取触发对方风控
  - 章节正文本地不缓存，按需实时抓（流量小、内容大）
  - 所有对外请求走同一 httpx.Client，带浏览器 UA
"""

from __future__ import annotations

import html
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

BASE = "https://www.quanben.io"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

# 站点分类 key → 中文名（顺序即前端展示顺序）
CATEGORIES: List[Dict[str, str]] = [
    {"key": "xuanhuan", "name": "玄幻奇幻"},
    {"key": "xianxia", "name": "武侠仙侠"},
    {"key": "dushi", "name": "都市生活"},
    {"key": "lishi", "name": "历史军事"},
    {"key": "youxi", "name": "网游竞技"},
    {"key": "kehuan", "name": "科幻灵异"},
    {"key": "xuanyi", "name": "悬疑推理"},
    {"key": "yanqing", "name": "古代言情"},
    {"key": "danmei", "name": "纯爱耽美"},
    {"key": "chuanyue", "name": "穿越重生"},
    {"key": "qingchun", "name": "青春校园"},
    {"key": "zhichang", "name": "职场商场"},
    {"key": "jingji", "name": "经济理财"},
    {"key": "guanchang", "name": "官场政界"},
    {"key": "junshi", "name": "军事战争"},
    {"key": "lingyi", "name": "灵异怪谈"},
    {"key": "qita", "name": "其他类型"},
]

_TTL = {
    "category": 30 * 60,
    "search": 10 * 60,
    "book": 60 * 60,
    "chapters": 60 * 60,
}
_cache: Dict[str, tuple[float, Any]] = {}

_client: Optional[httpx.Client] = None


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(
            headers=HEADERS,
            timeout=httpx.Timeout(15.0, connect=8.0),
            follow_redirects=True,
            limits=httpx.Limits(max_connections=10),
        )
    return _client


def _cached(key: str, kind: str, producer):
    now = time.time()
    hit = _cache.get(key)
    if hit and now - hit[0] < _TTL[kind]:
        return hit[1]
    value = producer()
    _cache[key] = (now, value)
    return value


def _clean_text(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def _fetch(url: str, retries: int = 2) -> str:
    """抓取页面，失败时短退避重试。

    外部站点偶发超时/连接重置，单次失败不该直接抛给用户，
    默认重试 2 次（间隔 0.4s / 0.8s）。
    """
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            res = _get_client().get(url)
            res.raise_for_status()
            # 站点以 utf-8 返回；httpx 依据 header 判断，缺失时兜底
            if not res.encoding or res.encoding.lower() in ("iso-8859-1", "ascii"):
                res.encoding = "utf-8"
            return res.text
        except httpx.HTTPError as e:
            last_err = e
            if attempt < retries:
                time.sleep(0.4 * (attempt + 1))
    raise last_err if last_err else RuntimeError(f"抓取失败: {url}")


# ── 分类 ────────────────────────────────────────────────
def list_categories() -> List[Dict[str, str]]:
    return CATEGORIES


# ── 分类下的书籍 ────────────────────────────────────────
def list_books_by_category(category: str, page: int = 1, refresh: bool = False) -> Dict[str, Any]:
    """抓取某个分类的第 page 页。

    站点分页规则（实测）：
      第 1 页  /c/xuanhuan.html
      第 n 页  /c/xuanhuan_n.html
    每页固定 12 本；页脚 `.cur_page` 文本形如 "1 / 1918"（当前页 / 总页数）。

    refresh=True 时绕过 TTL 缓存重新抓取（用户手动点「刷新」用）。
    """
    if not any(c["key"] == category for c in CATEGORIES):
        raise ValueError(f"未知分类: {category}")
    page = max(1, page)
    cache_key = f"cat:{category}:{page}"

    def produce():
        url = f"{BASE}/c/{category}.html" if page == 1 else f"{BASE}/c/{category}_{page}.html"
        doc = _fetch(url)
        cards = re.findall(
            r'<div class="list2"[^>]*>(.*?)</div>\s*</div>', doc, re.S
        )
        books = []
        for card in cards:
            m = re.search(r'<a href="(/n/[^"]+)"[^>]*>\s*<span[^>]*>(.*?)</span>', card, re.S)
            if not m:
                m = re.search(r'<a href="(/n/[^"]+)"[^>]*>(.*?)</a>', card, re.S)
            if not m:
                continue
            url_path, name = m.group(1), _clean_text(m.group(2))
            author = re.search(r'itemprop="author"[^>]*>(.*?)</span>', card, re.S)
            intro = re.search(r'itemprop="description"[^>]*>(.*?)</p>', card, re.S)
            cover = re.search(r'<img src="([^"]+)"', card)
            books.append({
                "bookUrl": url_path.rstrip("/"),
                "name": name,
                "author": _clean_text(author.group(1)) if author else "",
                "intro": _clean_text(intro.group(1)) if intro else "",
                "coverUrl": _abs(cover.group(1)) if cover else "",
            })

        # 总页数：<span class="cur_page">1 / 1918</span>
        cur = re.search(r'class="cur_page">\s*(\d+)\s*/\s*(\d+)\s*<', doc)
        total_pages = int(cur.group(2)) if cur else 1
        page_size = len(books) or 12
        return {
            "category": category,
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages,
            "total": total_pages * page_size,
            "list": books,
        }

    if refresh:
        value = produce()
        _cache[cache_key] = (time.time(), value)
        return value
    return _cached(cache_key, "category", produce)


# ── 搜索 ────────────────────────────────────────────────
def search_books(keyword: str) -> List[Dict[str, Any]]:
    keyword = (keyword or "").strip()
    if not keyword:
        return []
    cache_key = f"search:{keyword}"

    def produce():
        doc = _fetch(f"{BASE}/index.php?c=book&a=search&keywords={quote(keyword)}")
        # 搜索结果块与首页推荐块结构相同，取所有 /n/ 链接后按顺序去重
        seen, books = set(), []
        for m in re.finditer(r'<a href="(/n/[a-z0-9]+/)"[^>]*>(.*?)</a>', doc, re.S):
            slug, name = m.group(1).rstrip("/"), _clean_text(m.group(2))
            if not name or slug in seen:
                continue
            seen.add(slug)
            books.append({"bookUrl": slug, "name": name, "author": "", "coverUrl": ""})
        # 前几条补详情（作者/封面/简介），并发抓取；失败不影响主结果
        _enrich(books[:5])
        return books

    return _cached(cache_key, "search", produce)


# ── 书籍详情 ────────────────────────────────────────────
def get_book(book_url: str) -> Dict[str, Any]:
    slug = _normalize_book_url(book_url)
    cache_key = f"book:{slug}"

    def produce():
        doc = _fetch(f"{BASE}{slug}/")

        def meta(prop: str) -> str:
            m = re.search(
                rf'<meta property="{prop}" content="([^"]*)"', doc
            )
            return html.unescape(m.group(1)).strip() if m else ""

        name = meta("og:novel:book_name")
        if not name:
            m = re.search(r"<title>《(.*?)》", doc)
            name = _clean_text(m.group(1)) if m else slug.rstrip("/").rsplit("/", 1)[-1]
        return {
            "bookUrl": slug,
            "name": name,
            "author": meta("og:novel:author"),
            "category": meta("og:novel:category"),
            "status": meta("og:novel:status") or "未知",
            "coverUrl": meta("og:image"),
            "intro": meta("og:description").split("简介:", 1)[-1] or meta("og:description"),
            "readUrl": meta("og:novel:read_url"),
        }

    return _cached(cache_key, "book", produce)


# ── 章节目录 ────────────────────────────────────────────
def list_chapters(book_url: str, page: int = 1, size: int = 100) -> Dict[str, Any]:
    slug = _normalize_book_url(book_url)
    page = max(1, page)
    size = min(max(1, size), 500)
    cache_key = f"chapters:{slug}"

    def produce():
        doc = _fetch(f"{BASE}{slug}/list.html")
        chapters = []
        for m in re.finditer(r'<a href="/n/([a-z0-9]+)/(\d+)\.html"[^>]*>(.*?)</a>', doc, re.S):
            cid, title = m.group(2), _clean_text(m.group(3))
            chapters.append({"id": int(cid), "title": title})
        if not chapters:
            return {"bookUrl": slug, "total": 0, "page": page, "size": size, "list": []}
        total = len(chapters)
        start = (page - 1) * size
        return {
            "bookUrl": slug,
            "total": total,
            "page": page,
            "size": size,
            "list": chapters[start:start + size],
        }

    return _cached(cache_key, "chapters", produce)


# ── 章节正文 ────────────────────────────────────────────
def get_chapter_content(book_url: str, chapter_id: int) -> Dict[str, Any]:
    slug = _normalize_book_url(book_url)
    doc = _fetch(f"{BASE}{slug}/{int(chapter_id)}.html")

    title_m = re.search(r"<h1[^>]*>(.*?)</h1>", doc, re.S)
    title = _clean_text(title_m.group(1)) if title_m else ""

    body_m = re.search(r'<div[^>]*id="content"[^>]*>(.*?)</div>', doc, re.S)
    if not body_m:
        raise ValueError("未找到正文内容")
    paragraphs = [
        _clean_text(p)
        for p in re.findall(r"<p[^>]*>(.*?)</p>", body_m.group(1), re.S)
        if _clean_text(p)
    ]
    if not paragraphs:
        paragraphs = [_clean_text(body_m.group(1))]

    # 上下章：目录按数字顺序排列，直接 ±1
    return {
        "bookUrl": slug,
        "id": int(chapter_id),
        "title": title,
        "content": paragraphs,
        "prevId": int(chapter_id) - 1 if chapter_id > 1 else None,
        "nextId": int(chapter_id) + 1,
    }


# ── 工具 ────────────────────────────────────────────────
def _enrich(books: List[Dict[str, Any]]) -> None:
    """并发补全书籍的作者/封面/简介，失败静默跳过"""
    if not books:
        return

    def fill(book: Dict[str, Any]) -> None:
        try:
            detail = get_book(book["bookUrl"])
            book["author"] = detail.get("author", "")
            book["coverUrl"] = detail.get("coverUrl", "")
            book["intro"] = detail.get("intro", "")
        except Exception:
            pass

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(fill, books))


def _abs(url: str) -> str:
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    return BASE + url


def _normalize_book_url(book_url: str) -> str:
    """接受裸 slug / n/xxx / /n/xxx / /n/xxx/ / 完整 URL 五种形态，统一为 /n/xxx"""
    url = (book_url or "").strip().rstrip("/")
    m = re.search(r"(?:^|/)n/([a-z0-9]+)$", url)
    if m:
        return f"/n/{m.group(1)}"
    if re.fullmatch(r"[a-z0-9]+", url):  # 裸 slug，如 xianni
        return f"/n/{url}"
    raise ValueError(f"非法书籍地址: {book_url}")
