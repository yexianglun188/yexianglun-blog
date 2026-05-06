from hashlib import md5
from sqlmodel import Session, select
from fastapi import HTTPException

from app.models import Message
from app.schemas import MessageCreate


def _default_avatar(email: str) -> str:
    if email:
        h = md5(email.strip().lower().encode()).hexdigest()
        return f"https://www.gravatar.com/avatar/{h}?d=mp"
    return ""


def get_messages(
    session: Session,
    status: str = "approved",
    page: int = 1,
    size: int = 20,
) -> list[Message]:
    q = select(Message)
    if status:
        q = q.where(Message.status == status)
    q = q.order_by(Message.created_at.desc())
    q = q.offset((page - 1) * size).limit(size)
    return list(session.exec(q).all())


def create_message(session: Session, data: MessageCreate, ip: str = "") -> Message:
    msg = Message(
        nickname=data.nickname,
        email=data.email,
        website=data.website,
        content=data.content,
        avatar=_default_avatar(data.email),
        ip=ip,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return msg


def update_message_status(session: Session, msg_id: int, status: str) -> Message:
    msg = session.get(Message, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="留言不存在")
    msg.status = status
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return msg


def delete_message(session: Session, msg_id: int):
    msg = session.get(Message, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="留言不存在")
    session.delete(msg)
    session.commit()
