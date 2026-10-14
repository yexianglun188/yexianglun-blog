"""统一身份解析。

站点原来只有 GitHub OAuth 一种登录方式，现已改为「本地注册账号 + 访客浏览」，
但历史评论/留言仍绑定 GitHub 用户，因此这里同时解析两种身份：

- 本地账号：JWT payload 为 {"sub": "<username>"}
- GitHub 账号：JWT payload 为 {"sub": "<github_user.id>", "type": "github"}
- 访客：JWT payload 带 {"guest": true}，可浏览但不能留言/评论
"""

from dataclasses import dataclass
from typing import Optional

from jose import jwt
from fastapi import Request
from sqlmodel import Session, select

from app.config import ALGORITHM, SECRET_KEY
from app.models import GitHubUser, User


@dataclass
class Identity:
    user: Optional[User] = None
    github_user: Optional[GitHubUser] = None
    is_guest: bool = False

    @property
    def authenticated(self) -> bool:
        return self.user is not None or self.github_user is not None

    @property
    def can_comment(self) -> bool:
        """是否可以留言/评论（GitHub 历史账号与本地正式账号都可以）"""
        if self.github_user is not None:
            return True
        return self.user is not None and not self.user.is_guest


def resolve_identity(request: Request, session: Session) -> Identity:
    """从 Authorization 头解析身份；未登录或令牌无效时返回空 Identity。"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return Identity()

    try:
        payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return Identity()

    if payload.get("guest"):
        return Identity(is_guest=True)

    sub = str(payload.get("sub", ""))
    if not sub:
        return Identity()

    # 历史 GitHub 令牌：sub 是 github_user.id
    if payload.get("type") == "github" or sub.isdigit():
        gh = session.get(GitHubUser, int(sub)) if sub.isdigit() else None
        return Identity(github_user=gh)

    user = session.exec(select(User).where(User.username == sub)).first()
    return Identity(user=user)
