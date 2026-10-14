from datetime import datetime
from pydantic import BaseModel


class DogDiaryCreate(BaseModel):
    content: str
    author: str = ""
    sort: int = 0
    is_approved: bool = True


class DogDiaryUpdate(BaseModel):
    content: str | None = None
    author: str | None = None
    sort: int | None = None
    is_approved: bool | None = None


class DogDiaryOut(BaseModel):
    id: int
    content: str
    author: str
    sort: int
    is_approved: bool
    created_at: datetime
    updated_at: datetime | None = None
