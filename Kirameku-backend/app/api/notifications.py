from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from pydantic import BaseModel

from app.deps import get_session
from app.utils.auth import get_current_user
from app.models import (
    User,
    Comment,
    Message,
    ChatterComment,
    NotificationRead,
)

router = APIRouter(prefix="/api/notifications", tags=["通知"])


class NotificationItem(BaseModel):
    type: str  # "comment" | "chatter_comment" | "message"
    id: int
    from_user: str
    from_avatar: str
    reply_content: str  # 回复内容
    parent_content: str  # 被回复的原内容（截断）
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationItem]
    unread_count: int


def _current_user_id(session: Session, token: dict) -> int:
    """从 JWT 的 sub（username）反查 user.id"""
    username = token.get("sub")
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="用户不存在")
    return user.id


def _get_last_read(session: Session, user_id: int) -> datetime:
    row = session.get(NotificationRead, user_id)
    return row.last_read_at if row else datetime(1970, 1, 1)


def _collect(session: Session, user_id: int, last_read: datetime) -> tuple[list[NotificationItem], int]:
    items: list[NotificationItem] = []
    unread = 0

    def push(item: NotificationItem):
        nonlocal unread
        items.append(item)
        if item.created_at > last_read:
            unread += 1

    # 1. 文章评论：parent_id 指向我发的评论
    rows = session.exec(
        select(Comment, User)
        .join(User, User.id == Comment.user_id)
        .where(Comment.parent_id.is_not(None))
    ).all()
    # 父评论 id -> 我的评论
    my_comment_ids = set()
    for c in session.exec(
        select(Comment).where(Comment.user_id == user_id)
    ).all():
        my_comment_ids.add(c.id)
    for c, u in rows:
        if c.parent_id in my_comment_ids:
            parent = session.get(Comment, c.parent_id)
            push(NotificationItem(
                type="comment", id=c.id,
                from_user=u.nickname or u.username, from_avatar=u.avatar,
                reply_content=c.content,
                parent_content=(parent.content[:50] if parent else ""),
                created_at=c.created_at,
            ))

    # 2. 说说评论
    rows2 = session.exec(
        select(ChatterComment, User)
        .join(User, User.id == ChatterComment.user_id)
        .where(ChatterComment.parent_id.is_not(None))
    ).all()
    my_cc_ids = set()
    for cc in session.exec(
        select(ChatterComment).where(ChatterComment.user_id == user_id)
    ).all():
        my_cc_ids.add(cc.id)
    for c, u in rows2:
        if c.parent_id in my_cc_ids:
            parent = session.get(ChatterComment, c.parent_id)
            push(NotificationItem(
                type="chatter_comment", id=c.id,
                from_user=u.nickname or u.username, from_avatar=u.avatar,
                reply_content=c.content,
                parent_content=(parent.content[:50] if parent else ""),
                created_at=c.created_at,
            ))

    # 3. 留言板
    rows3 = session.exec(
        select(Message, User)
        .join(User, User.id == Message.user_id)
        .where(Message.parent_id.is_not(None))
    ).all()
    my_msg_ids = set()
    for m in session.exec(
        select(Message).where(Message.user_id == user_id)
    ).all():
        my_msg_ids.add(m.id)
    for c, u in rows3:
        if c.parent_id in my_msg_ids:
            parent = session.get(Message, c.parent_id)
            push(NotificationItem(
                type="message", id=c.id,
                from_user=u.nickname or u.username, from_avatar=u.avatar,
                reply_content=c.content,
                parent_content=(parent.content[:50] if parent else ""),
                created_at=c.created_at,
            ))

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items, unread


@router.get("", response_model=NotificationList)
def list_notifications(
    session: Session = Depends(get_session),
    token: dict = Depends(get_current_user),
):
    user_id = _current_user_id(session, token)
    last_read = _get_last_read(session, user_id)
    items, unread = _collect(session, user_id, last_read)
    return NotificationList(items=items, unread_count=unread)


@router.get("/unread-count")
def unread_count(
    session: Session = Depends(get_session),
    token: dict = Depends(get_current_user),
):
    user_id = _current_user_id(session, token)
    last_read = _get_last_read(session, user_id)
    _, unread = _collect(session, user_id, last_read)
    return {"unread_count": unread}


@router.post("/read")
def mark_read(
    session: Session = Depends(get_session),
    token: dict = Depends(get_current_user),
):
    user_id = _current_user_id(session, token)
    row = session.get(NotificationRead, user_id)
    now = datetime.now()
    if row:
        row.last_read_at = now
        row.updated_at = now
        session.add(row)
    else:
        session.add(NotificationRead(user_id=user_id, last_read_at=now, updated_at=now))
    session.commit()
    return {"ok": True}
