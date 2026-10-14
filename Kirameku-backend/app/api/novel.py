"""小说接口（自研爬虫，替代 reader3 / reader-master）

替代原先 reader3 外部服务（8085 端口，本地未部署导致 /novel 500）。
数据来源为公开免费小说站点 quanben.io，由 services/novel_crawler.py 抓取。

接口一览：
  GET  /api/novel/categories                     分类列表（17 类）
  GET  /api/novel/books?category=&page=&size=    某分类下的书籍
  GET  /api/novel/search?key=                    关键词搜索
  GET  /api/novel/book/{slug}                    书籍详情
  GET  /api/novel/chapters/{slug}?page=&size=    章节目录（分页）
  GET  /api/novel/chapter/{slug}/{id}            章节正文
"""

from fastapi import APIRouter, HTTPException, Query

from app.services import novel_crawler as crawler

router = APIRouter(prefix="/api/novel", tags=["小说"])


@router.get("/categories")
async def categories():
    return {"isSuccess": True, "data": crawler.list_categories()}


@router.get("/books")
async def books(
    category: str = Query(..., description="分类 key，如 xuanhuan"),
    page: int = Query(1, ge=1),
    refresh: bool = Query(False, description="true 则绕过缓存重新抓取"),
):
    try:
        return {"isSuccess": True, "data": crawler.list_books_by_category(category, page, refresh)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"上游抓取失败: {e}")


@router.get("/search")
async def search(key: str = Query(..., min_length=1)):
    try:
        return {"isSuccess": True, "data": crawler.search_books(key)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"上游抓取失败: {e}")


@router.get("/book/{slug:path}")
async def book(slug: str):
    try:
        return {"isSuccess": True, "data": crawler.get_book(slug)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"上游抓取失败: {e}")


@router.get("/chapters/{slug:path}")
async def chapters(
    slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
):
    try:
        return {"isSuccess": True, "data": crawler.list_chapters(slug, page, size)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"上游抓取失败: {e}")


@router.get("/chapter/{slug:path}/{chapter_id}")
async def chapter(slug: str, chapter_id: int):
    try:
        return {"isSuccess": True, "data": crawler.get_chapter_content(slug, chapter_id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"上游抓取失败: {e}")
