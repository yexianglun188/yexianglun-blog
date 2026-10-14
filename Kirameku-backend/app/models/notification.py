from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class NotificationRead(SQLModel, table=True):
    """记录每个用户「回复我的」通知已读到的最后时间点。

    只存一条每个用户的时间戳，比给每条评论加 is_read 字段更轻量。
    通知判定：三类（文章评论/说说评论/留言）里 parent_id 指向的父记录
    的 user_id 等于当前用户，且 created_at > last_read_at 即为未读。
    """

    __tablename__ = "notification_read"

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    last_read_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
