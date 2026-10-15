"""音乐表（酷我 + 网易云）

设计要点：
  - platform  'kuwo' | 'netease'，两个平台的取流方式不同
  - song_id   统一用字符串：网易云是数字 id，酷我同为数字 id，varchar 足够容纳
  - media_url 允许为空：两个平台的播放链接都带有时效，
             必须播放前动态获取，不能落库
  - (platform, song_id) 建唯一索引，防止同一首歌重复入库
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlmodel import Field, SQLModel


class Music(SQLModel, table=True):
    __tablename__ = "music"

    id: Optional[int] = Field(default=None, primary_key=True)

    # 平台标识：kuwo(酷我) / netease(网易云)
    platform: str = Field(default="netease", max_length=16, index=True)

    # 歌曲标识：两个平台都是数字 id，统一按字符串存储
    song_id: str = Field(max_length=64, index=True)

    name: str = Field(max_length=200)
    # 以下字段带 server_default：保证裸 SQL / 外部工具插入时也有默认值
    # （SQLModel 的 default 只在 Python 侧生效，不会写进 DDL）
    artist: str = Field(default="", max_length=200, sa_column_kwargs={"server_default": ""})
    album: str = Field(default="", max_length=200, sa_column_kwargs={"server_default": ""})
    cover: str = Field(default="", max_length=500, sa_column_kwargs={"server_default": ""})
    duration: str = Field(default="", max_length=16, sa_column_kwargs={"server_default": ""})

    # 播放链接带时效，必须播放前动态获取，不能落库
    media_url: Optional[str] = Field(default=None, max_length=1000)

    # 排序权重，越大越靠前（后台添加顺序）
    sort: int = Field(default=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("now()")},
    )
