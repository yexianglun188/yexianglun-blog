"""豆瓣榜单代理接口（前台「豆瓣榜单」工具消费）

豆瓣官方 v2 API 已关闭，这里转发豆瓣移动端（m.douban.com）的
subject_collection 榜单接口。移动端接口带 Referer 校验 + 反爬，
所以由后端统一转发，同时解决浏览器跨域和 https 图片回显问题。

可用榜单（collection 名）：
  movie_top250 / movie_hot / movie_real_time_hotest / movie_weekly_best
  tv_hot
  book_top250 / book_hot
  music_hot
"""

import httpx
from urllib.parse import quote
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response

router = APIRouter(prefix="/api/douban", tags=["豆瓣"])

DOUBAN_BASE = "https://m.douban.com/rexxar/api/v2/subject_collection"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    ),
    "Referer": "https://m.douban.com/",
}

# 允许的榜单白名单，防止任意路径被代理滥用
ALLOWED_COLLECTIONS = {
    "movie_top250",
    "movie_hot",
    "movie_real_time_hotest",
    "movie_weekly_best",
    "tv_hot",
    "book_top250",
    "book_hot",
    "music_hot",
}


@router.get("/list")
def douban_list(
    collection: str = Query(..., description="榜单名，如 movie_top250"),
    start: int = Query(0, ge=0),
    count: int = Query(20, ge=1, le=50),
):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="不支持的榜单类型")

    url = f"{DOUBAN_BASE}/{collection}/items"
    params = {"start": start, "count": count}
    try:
        resp = httpx.get(url, params=params, headers=HEADERS, timeout=15.0)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"豆瓣接口请求失败：{e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"豆瓣接口不可用：{e}")

    # 只返回前端需要的精简字段，减小体积
    items = data.get("subject_collection_items", [])
    simplified = [_simplify(it) for it in items]
    return {
        "total": data.get("total", len(simplified)),
        "items": simplified,
    }


@router.get("/img")
def douban_img(url: str = Query(..., description="豆瓣图片直链")):
    """图片代理：豆瓣图片有防盗链（校验 Referer），浏览器直接加载会被拒。

    这里由后端带豆瓣 Referer 抓取，返回图片字节，前端用站内 /api/douban/img?url= 加载。
    只允许 doubanio.com 域名，防止被当作任意 URL 代理滥用。
    """
    if "doubanio.com" not in url:
        raise HTTPException(status_code=400, detail="仅支持豆瓣图片域名")

    try:
        resp = httpx.get(url, headers=HEADERS, timeout=15.0, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"图片抓取失败：{e}")

    content_type = resp.headers.get("content-type", "image/jpeg")
    return Response(
        content=resp.content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


def _simplify(it: dict) -> dict:
    rating = it.get("rating") or {}
    pic = it.get("pic") or {}
    cover = it.get("cover") or {}
    cover_url = (
        it.get("cover_url")
        or pic.get("normal")
        or pic.get("large")
        or (cover.get("url") if isinstance(cover, dict) else None)
        or ""
    )
    # 图片走站内代理，绕开豆瓣防盗链
    proxied_cover = f"/api/douban/img?url={quote(cover_url, safe='')}" if cover_url else ""
    return {
        "id": str(it.get("id", "")),
        "title": it.get("title", ""),
        "type": it.get("type", ""),
        "rating": rating.get("value"),
        "rating_count": rating.get("count"),
        "subtitle": it.get("card_subtitle", ""),
        "description": it.get("description", ""),
        "cover": proxied_cover,
    }
