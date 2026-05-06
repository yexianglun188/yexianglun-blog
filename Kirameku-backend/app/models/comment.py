from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Comment(SQLModel, table=True):
    __tablename__ = "comment"

    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id", index=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="comment.id")
    nickname: str = Field(max_length=50)
    email: str = Field(default="", max_length=100)
    website: str = Field(default="", max_length=200)
    content: str
    avatar: str = Field(default="", max_length=500)
    ip: str = Field(default="", max_length=45)
    status: str = Field(default="pending", max_length=20, index=True)
    created_at: datetime = Field(default_factory=datetime.now)
