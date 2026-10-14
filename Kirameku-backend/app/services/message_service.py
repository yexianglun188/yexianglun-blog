from sqlmodel import Session, select
from fastapi import HTTPException

from app.models import Message, GitHubUser, User
from app.schemas import MessageCreate


def get_messages(
    session: Session,
    status: str | None = "approved",
    page: int = 1,
    size: int = 20,
) -> list[dict]:
    """获取留言列表（仅顶层），嵌套回复"""
    q = select(Message)
    if status:
        q = q.where(Message.status == status)
    q = q.where(Message.parent_id.is_(None))  # 只取顶层
    q = q.order_by(Message.created_at.desc())
    q = q.offset((page - 1) * size).limit(size)
    rows = list(session.exec(q).all())

    result = []
    for msg in rows:
        result.append(_message_to_dict(session, msg))
    return result


def get_message_count(session: Session, status: str | None = "approved") -> int:
    q = select(Message)
    if status:
        q = q.where(Message.status == status)
    q = q.where(Message.parent_id.is_(None))
    return len(list(session.exec(q).all()))


def create_message(
    session: Session,
    data: MessageCreate,
    user: User | None = None,
    ip: str = "",
) -> dict:
    """创建留言（需要已登录的本地账号，访客身份禁止留言）"""
    if not user:
        raise HTTPException(401, "请先登录")
    if user.is_guest:
        raise HTTPException(403, "访客身份不能留言，请注册账号")

    # 如果是回复，检查父留言是否存在
    if data.parent_id:
        parent = session.get(Message, data.parent_id)
        if not parent:
            raise HTTPException(404, "被回复的留言不存在")

    msg = Message(
        user_id=user.id,
        parent_id=data.parent_id,
        content=data.content,
        ip=ip,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return _message_to_dict(session, msg)


def update_message_status(session: Session, msg_id: int, status: str) -> dict:
    msg = session.get(Message, msg_id)
    if not msg:
        raise HTTPException(404, "留言不存在")
    msg.status = status
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return _message_to_dict(session, msg)


def delete_message(session: Session, msg_id: int):
    msg = session.get(Message, msg_id)
    if not msg:
        raise HTTPException(404, "留言不存在")
    session.delete(msg)
    session.commit()


def toggle_like(session: Session, msg_id: int, unlike: bool = False) -> dict:
    msg = session.get(Message, msg_id)
    if not msg:
        raise HTTPException(404, "留言不存在")
    msg.likes = max(0, msg.likes + (-1 if unlike else 1))
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return _message_to_dict(session, msg)


def _message_to_dict(session: Session, msg: Message) -> dict:
    """将 Message 转为带作者（user / 兼容 github_user）和 replies 的字典"""
    gh_user = session.get(GitHubUser, msg.github_user_id) if msg.github_user_id else None
    local_user = session.get(User, msg.user_id) if msg.user_id else None

    # 获取回复
    replies_q = (
        select(Message)
        .where(Message.parent_id == msg.id)
        .where(Message.status == "approved")
        .order_by(Message.created_at.asc())
    )
    replies = list(session.exec(replies_q).all())

    return {
        "id": msg.id,
        "github_user_id": msg.github_user_id,
        "user_id": msg.user_id,
        "parent_id": msg.parent_id,
        "content": msg.content,
        "ip": msg.ip,
        "status": msg.status,
        "likes": msg.likes,
        "created_at": msg.created_at,
        "user": {
            "id": local_user.id,
            "username": local_user.username,
            "nickname": local_user.nickname or local_user.username,
            "avatar": local_user.avatar or "",
            "is_guest": local_user.is_guest,
        } if local_user else None,
        # 兼容历史数据：早期留言只有 github_user
        "github_user": {
            "id": gh_user.id,
            "login": gh_user.login,
            "avatar": gh_user.avatar,
            "bio": gh_user.bio,
        } if gh_user else None,
        "replies": [_message_to_dict(session, r) for r in replies],
    }
