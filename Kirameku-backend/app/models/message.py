from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    __tablename__ = "message"

    id: Optional[int] = Field(default=None, primary_key=True)
    nickname: str = Field(max_length=50)
    email: str = Field(default="", max_length=100)
    website: str = Field(default="", max_length=200)
    content: str
    avatar: str = Field(default="", max_length=500)
    ip: str = Field(default="", max_length=45)
    status: str = Field(default="pending", max_length=20, index=True)
    likes: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.now)
