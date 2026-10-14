from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Text
from sqlmodel import SQLModel, Field


class DogDiary(SQLModel, table=True):
    """舔狗日记：后台维护，前台随机展示一条"""

    __tablename__ = "dog_diary"

    id: Optional[int] = Field(default=None, primary_key=True)
    content: str = Field(default="", sa_column=Column(Text, nullable=False))
    author: str = Field(default="", max_length=50)
    sort: int = Field(default=0)
    is_approved: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
