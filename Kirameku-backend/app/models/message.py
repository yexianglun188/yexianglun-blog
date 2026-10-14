from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    __tablename__ = "message"

    id: Optional[int] = Field(default=None, primary_key=True)
    # github_user_id：历史遗留（原 GitHub OAuth 体系的留言），保留只为兼容旧数据展示
    github_user_id: Optional[int] = Field(default=None, foreign_key="github_user.id", index=True)
    # user_id：当前账号体系（本地注册用户）的留言归属
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="message.id", index=True)
    content: str
    ip: str = Field(default="", max_length=45)
    status: str = Field(default="approved", max_length=20, index=True)
    likes: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.now)
