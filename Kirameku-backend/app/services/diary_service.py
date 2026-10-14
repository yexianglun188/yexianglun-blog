from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select, func

from app.models import DogDiary
from app.schemas import DogDiaryCreate, DogDiaryUpdate


def _conditions(approved_only: bool, keyword: str):
    conds = []
    if approved_only:
        conds.append(DogDiary.is_approved.is_(True))
    if keyword:
        conds.append(DogDiary.content.ilike(f"%{keyword}%"))
    return conds


def get_diaries(
    session: Session, approved_only: bool = True, keyword: str = ""
) -> list[DogDiary]:
    q = select(DogDiary).where(*_conditions(approved_only, keyword))
    q = q.order_by(DogDiary.sort, DogDiary.id.desc())
    return list(session.exec(q).all())


def count_diaries(session: Session, approved_only: bool = True) -> int:
    q = select(func.count(DogDiary.id)).where(*_conditions(approved_only, ""))
    return session.exec(q).one()


def random_diary(session: Session) -> DogDiary | None:
    """随机取一条已启用的日记；没有数据时返回 None"""
    q = (
        select(DogDiary)
        .where(DogDiary.is_approved.is_(True))
        .order_by(func.random())
        .limit(1)
    )
    return session.exec(q).first()


def create_diary(session: Session, data: DogDiaryCreate) -> DogDiary:
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="日记内容不能为空")
    diary = DogDiary(
        content=content,
        author=data.author.strip(),
        sort=data.sort,
        is_approved=data.is_approved,
    )
    session.add(diary)
    session.commit()
    session.refresh(diary)
    return diary


def update_diary(
    session: Session, diary_id: int, data: DogDiaryUpdate
) -> DogDiary:
    diary = session.get(DogDiary, diary_id)
    if not diary:
        raise HTTPException(status_code=404, detail="日记不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "content" and v is not None:
            v = v.strip()
            if not v:
                raise HTTPException(status_code=400, detail="日记内容不能为空")
        setattr(diary, k, v)
    diary.updated_at = datetime.now()
    session.add(diary)
    session.commit()
    session.refresh(diary)
    return diary


def delete_diary(session: Session, diary_id: int):
    diary = session.get(DogDiary, diary_id)
    if not diary:
        raise HTTPException(status_code=404, detail="日记不存在")
    session.delete(diary)
    session.commit()
