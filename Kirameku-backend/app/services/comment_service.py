from datetime import datetime
from hashlib import md5
from sqlmodel import Session, select, func
from fastapi import HTTPException

from app.models import Comment
from app.schemas import CommentCreate


def _default_avatar(email: str) -> str:
    if email:
        h = md5(email.strip().lower().encode()).hexdigest()
        return f"https://www.gravatar.com/avatar/{h}?d=mp"
    return ""


def get_comments_by_post(session: Session, post_id: int) -> list[dict]:
    """获取文章的所有已审核评论，按层级组装。"""
    rows = list(
        session.exec(
            select(Comment)
            .where(Comment.post_id == post_id, Comment.status == "approved")
            .order_by(Comment.created_at)
        ).all()
    )
    id_map: dict[int, dict] = {}
    roots: list[dict] = []
    for c in rows:
        d = {
            "id": c.id,
            "post_id": c.post_id,
            "parent_id": c.parent_id,
            "nickname": c.nickname,
            "website": c.website,
            "content": c.content,
            "avatar": c.avatar,
            "status": c.status,
            "created_at": c.created_at,
            "replies": [],
        }
        id_map[c.id] = d
    for c in rows:
        d = id_map[c.id]
        if c.parent_id and c.parent_id in id_map:
            id_map[c.parent_id]["replies"].append(d)
        else:
            roots.append(d)
    return roots


def get_comments_admin(
    session: Session,
    status: str | None = None,
    page: int = 1,
    size: int = 20,
) -> list[Comment]:
    q = select(Comment)
    if status:
        q = q.where(Comment.status == status)
    q = q.order_by(Comment.created_at.desc())
    q = q.offset((page - 1) * size).limit(size)
    return list(session.exec(q).all())


def create_comment(session: Session, data: CommentCreate, ip: str = "") -> Comment:
    comment = Comment(
        post_id=data.post_id,
        parent_id=data.parent_id,
        nickname=data.nickname,
        email=data.email,
        website=data.website,
        content=data.content,
        avatar=_default_avatar(data.email),
        ip=ip,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def update_comment_status(session: Session, comment_id: int, status: str) -> Comment:
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    comment.status = status
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def delete_comment(session: Session, comment_id: int):
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    session.delete(comment)
    session.commit()
