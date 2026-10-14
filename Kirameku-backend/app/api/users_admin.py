"""后台用户管理。

前台注册的账号（以及历史遗留账号）此前在后台完全不可见、不可管，
这里补齐：列表 / 搜索 / 编辑 / 重置密码 / 删除。
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_

from app.deps import get_session, get_current_user
from app.models import User, Comment, ChatterComment, Message
from app.utils.auth import hash_password

router = APIRouter(prefix="/api/admin/users", tags=["后台-用户管理"])


def _require_admin(user: dict) -> None:
    """仅管理员可操作（前台普通账号拿到令牌也不能动这里）"""
    if not user.get("admin"):
        raise HTTPException(status_code=403, detail="需要管理员权限")


def _user_out(u: User, comment_count: int = 0, chatter_count: int = 0, message_count: int = 0) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "nickname": u.nickname or u.username,
        "email": u.email or "",
        "bio": u.bio or "",
        "avatar": u.avatar or "",
        "is_admin": u.is_admin,
        "is_guest": u.is_guest,
        "comment_count": comment_count,
        "chatter_count": chatter_count,
        "message_count": message_count,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }


@router.get("")
def list_users(
    keyword: str = Query(default="", max_length=50),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)

    stmt = select(User)
    count_stmt = select(func.count(User.id))
    kw = keyword.strip()
    if kw:
        like = f"%{kw}%"
        cond = or_(
            User.username.contains(kw),
            User.nickname.contains(kw),
            User.email.contains(kw),
        )
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = session.exec(count_stmt).one()
    items = session.exec(
        stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    ).all()

    # 批量统计发言数（一条查询一种内容，数据量小没必要精细优化）
    data = []
    for u in items:
        cc = session.exec(
            select(func.count(Comment.id)).where(Comment.user_id == u.id)
        ).one()
        kc = session.exec(
            select(func.count(ChatterComment.id)).where(ChatterComment.user_id == u.id)
        ).one()
        mc = session.exec(
            select(func.count(Message.id)).where(Message.user_id == u.id)
        ).one()
        data.append(_user_out(u, cc, kc, mc))

    return {"code": 0, "message": "success", "data": {"items": data, "total": total}}


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    if "nickname" in data:
        target.nickname = (data.get("nickname") or "").strip()[:50]
    if "email" in data:
        target.email = (data.get("email") or "").strip()[:100]
    if "bio" in data:
        target.bio = (data.get("bio") or "").strip()[:500]
    if "is_admin" in data:
        # 不能把自己降权，避免把自己锁在门外
        if target.username == user.get("sub"):
            raise HTTPException(status_code=400, detail="不能修改自己的管理员身份")
        target.is_admin = bool(data["is_admin"])

    target.updated_at = datetime.now()
    session.add(target)
    session.commit()
    session.refresh(target)
    return {"code": 0, "message": "更新成功", "data": _user_out(target)}


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    password = (data.get("password") or "").strip()
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 位")
    target.hashed_password = hash_password(password)
    target.updated_at = datetime.now()
    session.add(target)
    session.commit()
    return {"code": 0, "message": "密码已重置"}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    if target.username == user.get("sub"):
        raise HTTPException(status_code=400, detail="不能删除当前登录的账号")
    if target.is_admin:
        admins = session.exec(select(User).where(User.is_admin == True)).all()  # noqa: E712
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="至少保留一个管理员账号")

    # 发言保留，作者置空（设为 NULL 而不是级联删除，避免误删内容）
    for model in (Comment, ChatterComment, Message):
        rows = session.exec(select(model).where(model.user_id == user_id)).all()
        for row in rows:
            row.user_id = None
            session.add(row)

    session.delete(target)
    session.commit()
    return {"code": 0, "message": "已删除"}
