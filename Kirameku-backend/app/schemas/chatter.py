from datetime import datetime
from pydantic import BaseModel


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
    updated_at: datetime


class ChatterCommentCreate(BaseModel):
    chatter_id: int
    parent_id: int | None = None
    nickname: str
    email: str = ""
    content: str


class ChatterCommentOut(BaseModel):
    id: int
    chatter_id: int
    parent_id: int | None
    nickname: str
    content: str
    avatar: str
    status: str
    created_at: datetime
    replies: list["ChatterCommentOut"] = []
