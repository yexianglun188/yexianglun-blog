from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.deps import get_session, get_current_user
from app.schemas import DogDiaryCreate, DogDiaryUpdate, DogDiaryOut
from app.services import diary_service

router = APIRouter(prefix="/api/dog-diary", tags=["舔狗日记"])


@router.get("/random", response_model=DogDiaryOut | None)
def get_random_diary(session: Session = Depends(get_session)):
    """前台首页用：随机一条已启用的日记，没有数据时返回 null"""
    return diary_service.random_diary(session)


@router.get("", response_model=list[DogDiaryOut])
def list_diaries(session: Session = Depends(get_session)):
    """前台公开列表（仅已启用）"""
    return diary_service.get_diaries(session, approved_only=True)


@router.get("/admin", response_model=list[DogDiaryOut])
def admin_list_diaries(
    keyword: str = Query(default=""),
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    """后台管理列表（含未启用，可按关键词搜索）"""
    return diary_service.get_diaries(session, approved_only=False, keyword=keyword)


@router.post("", response_model=DogDiaryOut)
def create_diary(
    data: DogDiaryCreate,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return diary_service.create_diary(session, data)


@router.put("/{diary_id}", response_model=DogDiaryOut)
def update_diary(
    diary_id: int,
    data: DogDiaryUpdate,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return diary_service.update_diary(session, diary_id, data)


@router.delete("/{diary_id}")
def delete_diary(
    diary_id: int,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    diary_service.delete_diary(session, diary_id)
    return {"ok": True}
