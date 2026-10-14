from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import Session

from app.deps import get_session
from app.services import visitor_service

router = APIRouter(prefix="/api/visitors", tags=["访客记录"])


@router.get("")
def list_recent_visitors(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    only: str = Query("", description="human=只看真人 / bot=只看机器人 / 空=全部"),
    session: Session = Depends(get_session),
):
    """获取最近访客列表（默认记录全部来源，机器人打 is_bot 标记）"""
    visitors = visitor_service.get_recent_visitors(session, page, size, only)
    return {"code": 0, "data": visitors}


@router.get("/stats")
def visitor_stats(session: Session = Depends(get_session)):
    """访客统计：总数 / 真人 / 机器人 / 本机 / 重复"""
    return {"code": 0, "data": visitor_service.get_stats(session)}


@router.get("/count")
def visitor_count(
    only: str = Query("", description="human=真人 / bot=机器人 / 空=全部"),
    session: Session = Depends(get_session),
):
    """获取访客数"""
    return {"code": 0, "count": visitor_service.get_visitor_count(session, only)}


@router.get("/location")
def get_visitor_location(
    request: Request,
):
    """获取当前访问者的地理位置"""
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("x-real-ip", "")
    if not ip:
        ip = request.client.host if request.client else ""

    geo = visitor_service._fetch_geo(ip)
    return {"code": 0, "data": geo}


@router.post("/record")
def record_visitor(
    request: Request,
    session: Session = Depends(get_session),
):
    """记录当前访问（前端调用）"""
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("x-real-ip", "")
    if not ip:
        ip = request.client.host if request.client else ""

    path = request.headers.get("x-path", "")
    ua = request.headers.get("user-agent", "")

    visitor_service.record_visit(session, ip, path, ua)
    return {"code": 0, "message": "ok"}


@router.post("/cleanup")
def clean_invalid_records(
    scope: str = Query(..., description="duplicate=重复 / local=本机 / bot=机器人"),
    session: Session = Depends(get_session),
):
    """清理无效访客记录"""
    n = visitor_service.clean_records(session, scope)
    return {"code": 0, "deleted": n, "scope": scope}


@router.delete("/{visitor_id}")
def delete_visitor(
    visitor_id: int,
    session: Session = Depends(get_session),
):
    """删除单条访客记录"""
    visitor_service.delete_visitor(session, visitor_id)
    return {"code": 0, "message": "ok"}


@router.delete("")
def clear_visitors(session: Session = Depends(get_session)):
    """清空所有访客记录"""
    visitor_service.clear_visitors(session)
    return {"code": 0, "message": "ok"}
