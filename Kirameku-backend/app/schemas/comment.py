from datetime import datetime
from pydantic import BaseModel


class GitHubUserOut(BaseModel):
    id: int
    login: str
    avatar: str
    bio: str


class UserOut(BaseModel):
    """本地账号的公开信息（留言/评论作者展示用）"""
    id: int
    username: str
    nickname: str
    avatar: str
    is_guest: bool = False


class CommentCreate(BaseModel):
    post_id: int
    parent_id: int | None = None
    content: str


class CommentOut(BaseModel):
    id: int
    post_id: int
    parent_id: int | None
    content: str
    likes: int = 0
    status: str
    created_at: datetime
    user_id: int | None = None
    # 作者：本地账号优先；github_user 仅为兼容历史评论
    user: UserOut | None = None
    github_user: GitHubUserOut | None = None
    replies: list["CommentOut"] = []


class CommentAdminUpdate(BaseModel):
    status: str  # approved / rejected


# 留言板/杂谈
class MessageCreate(BaseModel):
    content: str
    parent_id: int | None = None


class MessageOut(BaseModel):
    id: int
    github_user_id: int | None
    user_id: int | None = None
    parent_id: int | None
    content: str
    ip: str = ""
    status: str
    likes: int
    created_at: datetime
    # 作者：本地账号优先；github_user 仅为兼容历史留言
    user: UserOut | None = None
    github_user: GitHubUserOut | None = None
    replies: list["MessageOut"] = []


class MessageAdminUpdate(BaseModel):
    status: str
