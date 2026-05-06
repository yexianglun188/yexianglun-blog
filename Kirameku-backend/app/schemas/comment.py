from datetime import datetime
from pydantic import BaseModel


class CommentCreate(BaseModel):
    post_id: int
    parent_id: int | None = None
    nickname: str
    email: str = ""
    website: str = ""
    content: str


class CommentOut(BaseModel):
    id: int
    post_id: int
    parent_id: int | None
    nickname: str
    website: str
    content: str
    avatar: str
    status: str
    created_at: datetime
    replies: list["CommentOut"] = []


class CommentAdminUpdate(BaseModel):
    status: str  # approved / rejected


# 留言板
class MessageCreate(BaseModel):
    nickname: str
    email: str = ""
    website: str = ""
    content: str


class MessageOut(BaseModel):
    id: int
    nickname: str
    website: str
    content: str
    avatar: str
    status: str
    likes: int
    created_at: datetime


class MessageAdminUpdate(BaseModel):
    status: str
