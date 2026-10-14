from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select

from app.deps import get_session, get_current_user
from app.models import User
from app.schemas import MessageCreate, MessageOut, MessageAdminUpdate
from app.services import message_service

router = APIRouter(prefix="/api/messages", tags=["留言板"])


# ---- 公开接口 ----

@router.get("", response_model=list[MessageOut])
def list_messages(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    return message_service.get_messages(session, "approved", page, size)


@router.get("/count")
def message_count(session: Session = Depends(get_session)):
    return {"count": message_service.get_message_count(session, "approved")}


@router.post("", response_model=dict)
def create_message(
    data: MessageCreate,
    request: Request,
    session: Session = Depends(get_session),
    token: dict = Depends(get_current_user),
):
    """发表留言 / 回复

    需要登录（JWT）。访客身份会被拒绝（403）。
    """
    # 访客令牌：sub 是 guest_xxx，user 表里没有对应行，直接按访客规则拒绝
    if token.get("guest"):
        raise HTTPException(status_code=403, detail="访客身份不能留言，请注册账号")

    username = token.get("sub")
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=401, detail="登录状态已失效，请重新登录")
    if user.is_guest:
        raise HTTPException(status_code=403, detail="访客身份不能留言，请注册账号")

    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("x-real-ip", "")
    if not ip:
        ip = request.client.host if request.client else ""
    return message_service.create_message(session, data, user, ip)


@router.post("/{msg_id}/like")
def like_message(
    msg_id: int,
    session: Session = Depends(get_session),
):
    return message_service.toggle_like(session, msg_id, unlike=False)


@router.post("/{msg_id}/unlike")
def unlike_message(
    msg_id: int,
    session: Session = Depends(get_session),
):
    return message_service.toggle_like(session, msg_id, unlike=True)


# ---- 管理接口 ----

@router.get("/admin/count")
def admin_message_count(
    status: str | None = None,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return {"count": message_service.get_message_count(session, status)}


@router.get("/admin", response_model=list[MessageOut])
def admin_list_messages(
    status: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return message_service.get_messages(session, status, page, size)


@router.put("/{msg_id}/status")
def update_message_status(
    msg_id: int,
    data: MessageAdminUpdate,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return message_service.update_message_status(session, msg_id, data.status)


@router.delete("/{msg_id}")
def delete_message(
    msg_id: int,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    message_service.delete_message(session, msg_id)
    return {"ok": True}
