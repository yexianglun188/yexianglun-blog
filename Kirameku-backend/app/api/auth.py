from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.deps import get_session
from app.models import User
from app.schemas import LoginRequest, RegisterRequest
from app.config import ACCESS_TOKEN_EXPIRE_HOURS
from app.deps import get_current_user
from app.utils.auth import verify_password, create_token, hash_password

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login")
def login(req: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == req.username)).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if user.is_guest:
        raise HTTPException(status_code=403, detail="这是访客账号，请使用「以访客身份浏览」入口")

    return _token_payload(user)


@router.post("/register")
def register(req: RegisterRequest, session: Session = Depends(get_session)):
    """前台注册账号（注册后自动登录）"""
    username = (req.username or "").strip()
    password = req.password or ""
    nickname = (req.nickname or "").strip()

    if len(username) < 3 or len(username) > 20:
        raise HTTPException(status_code=400, detail="用户名长度需在 3~20 个字符之间")
    if not username.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="用户名只能包含字母、数字和下划线")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 位")
    if username.lower().startswith("guest"):
        raise HTTPException(status_code=400, detail="该用户名不可用")

    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=409, detail="用户名已被注册")

    user = User(
        username=username,
        hashed_password=hash_password(password),
        nickname=nickname or username,
        is_admin=False,
        is_guest=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _token_payload(user)


@router.post("/guest")
def guest_login():
    """访客登录：不落库，签发一个带 guest 标记的令牌。

    访客可以正常浏览全站，但不能留言（留言接口会按 is_guest 拒绝）。
    """
    token = create_token({"sub": f"guest_{uuid4().hex[:8]}", "guest": True})
    return {
        "code": 0,
        "message": "success",
        "data": {
            "accessToken": token,
            "refreshToken": "",
            "expires": (datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)).isoformat(),
            "avatar": "",
            "username": "guest",
            "nickname": "访客",
            "roles": [],
            "permissions": [],
            "isGuest": True,
        },
    }


def _token_payload(user: User) -> dict:
    """登录/注册统一的返回结构（与后台 Pure Admin 的约定保持一致）"""
    token = create_token({"sub": user.username, "admin": user.is_admin})
    expires = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return {
        "code": 0,
        "message": "success",
        "data": {
            "accessToken": token,
            "refreshToken": "",
            "expires": expires.isoformat(),
            "avatar": user.avatar or "",
            "username": user.username,
            "nickname": user.nickname or user.username,
            "roles": ["admin"] if user.is_admin else [],
            "permissions": ["*:*:*"] if user.is_admin else [],
            "isGuest": user.is_guest,
        },
    }


@router.get("/me")
def me(user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    username = user.get("sub")
    db_user = session.exec(select(User).where(User.username == username)).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "code": 0,
        "message": "success",
        "data": {
            "avatar": db_user.avatar or "",
            "username": db_user.username,
            "nickname": db_user.nickname or db_user.username,
            "email": db_user.email or "",
            "description": db_user.bio or "",
            "phone": "",
            "roles": ["admin"] if db_user.is_admin else [],
            "permissions": ["*:*:*"] if db_user.is_admin else [],
        },
    }


@router.put("/me")
def update_me(
    data: dict,
    user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    username = user.get("sub")
    db_user = session.exec(select(User).where(User.username == username)).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if "nickname" in data:
        db_user.nickname = data["nickname"]
    if "email" in data:
        db_user.email = data["email"]
    if "bio" in data or "description" in data:
        db_user.bio = data.get("bio") or data.get("description") or ""
    if "avatar" in data:
        db_user.avatar = data["avatar"]
    db_user.updated_at = datetime.now()
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return {"code": 0, "message": "更新成功"}
