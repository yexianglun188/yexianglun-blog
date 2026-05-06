import json
from datetime import datetime
from hashlib import md5
from sqlmodel import Session, select, func
from fastapi import HTTPException

from app.models import Chatter, ChatterComment
from app.schemas import ChatterCreate, ChatterUpdate, ChatterCommentCreate


def _default_avatar(email: str) -> str:
    if email:
        h = md5(email.strip().lower().encode()).hexdigest()
        return f"https://www.gravatar.com/avatar/{h}?d=mp"
    return ""


def get_chatters(
    session: Session,
    status: str = "published",
    page: int = 1,
    size: int = 20,
) -> list[dict]:
    q = select(Chatter)
    if status:
        q = q.where(Chatter.status == status)
    q = q.order_by(Chatter.created_at.desc())
    q = q.offset((page - 1) * size).limit(size)
    rows = list(session.exec(q).all())
    return [
        {
            "id": r.id,
            "content": r.content,
            "images": json.loads(r.images) if r.images else [],
            "mood": r.mood or "",
            "likes": r.likes,
            "comments_count": r.comments_count,
            "status": r.status,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }
        for r in rows
    ]


def get_chatter_by_id(session: Session, chatter_id: int) -> dict:
    c = session.get(Chatter, chatter_id)
    if not c:
        raise HTTPException(status_code=404, detail="说说不存在")
    return {
        "id": c.id,
        "content": c.content,
        "images": json.loads(c.images) if c.images else [],
        "mood": c.mood or "",
        "likes": c.likes,
        "comments_count": c.comments_count,
        "status": c.status,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }


def create_chatter(session: Session, data: ChatterCreate) -> dict:
    c = Chatter(
        content=data.content,
        images=json.dumps(data.images, ensure_ascii=False),
        mood=data.mood,
        status=data.status,
    )
    if c.status == "published":
        c.created_at = datetime.now()
    session.add(c)
    session.commit()
    session.refresh(c)
    return get_chatter_by_id(session, c.id)


def update_chatter(session: Session, chatter_id: int, data: ChatterUpdate) -> dict:
    c = session.get(Chatter, chatter_id)
    if not c:
        raise HTTPException(status_code=404, detail="说说不存在")
    if data.content is not None:
        c.content = data.content
    if data.images is not None:
        c.images = json.dumps(data.images, ensure_ascii=False)
    if data.mood is not None:
        c.mood = data.mood
    if data.status is not None:
        c.status = data.status
    c.updated_at = datetime.now()
    session.add(c)
    session.commit()
    session.refresh(c)
    return get_chatter_by_id(session, c.id)


def count_chatters(session: Session, status: str = "published") -> int:
    q = select(func.count(Chatter.id))
    if status:
        q = q.where(Chatter.status == status)
    return session.exec(q).one()


def delete_chatter(session: Session, chatter_id: int):
    c = session.get(Chatter, chatter_id)
    if not c:
        raise HTTPException(status_code=404, detail="说说不存在")
    session.delete(c)
    session.commit()


def get_chatter_comments(session: Session, chatter_id: int) -> list[dict]:
    rows = list(
        session.exec(
            select(ChatterComment)
            .where(ChatterComment.chatter_id == chatter_id, ChatterComment.status == "approved")
            .order_by(ChatterComment.created_at)
        ).all()
    )
    id_map: dict[int, dict] = {}
    roots: list[dict] = []
    for c in rows:
        d = {
            "id": c.id,
            "chatter_id": c.chatter_id,
            "parent_id": c.parent_id,
            "nickname": c.nickname,
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


def create_chatter_comment(
    session: Session, data: ChatterCommentCreate, ip: str = ""
) -> ChatterComment:
    c = session.get(Chatter, data.chatter_id)
    if not c:
        raise HTTPException(status_code=404, detail="说说不存在")
    comment = ChatterComment(
        chatter_id=data.chatter_id,
        parent_id=data.parent_id,
        nickname=data.nickname,
        email=data.email,
        content=data.content,
        avatar=_default_avatar(data.email),
        ip=ip,
    )
    session.add(comment)
    session.flush()
    c.comments_count += 1
    session.add(c)
    session.commit()
    session.refresh(comment)
    return comment
