from datetime import datetime
from pydantic import BaseModel

from app.schemas.comment import GitHubUserOut, UserOut


class ChatterCreate(BaseModel):
    content: str
    images: list[str] = []
    mood: str = ""
    status: str = "draft"


class ChatterUpdate(BaseModel):
    content: str | None = None
    images: list[str] | None = None
    mood: str | None = None
    status: str | None = None


class ChatterOut(BaseModel):
    id: int
    content: str
    images: list[str] = []
    mood: str
    likes: int
    comments_count: int
    status: str
    created_at: datetime
    updated_at: datetime | None = None


class ChatterCommentCreate(BaseModel):
    chatter_id: int
    parent_id: int | None = None
    content: str


class ChatterCommentOut(BaseModel):
    id: int
    chatter_id: int
    parent_id: int | None
    content: str
    likes: int = 0
    status: str
    created_at: datetime
    user_id: int | None = None
    # 作者：本地账号优先；github_user 仅为兼容历史评论
    user: UserOut | None = None
    github_user: GitHubUserOut | None = None
    replies: list["ChatterCommentOut"] = []
