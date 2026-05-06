from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.schemas import SiteConfigUpdate, SiteConfigOut
from app.services import site_config_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/site-config", tags=["站点配置"])


@router.get("")
def get_all_config(session: Session = Depends(get_session)):
    return site_config_service.get_all_config(session)


@router.get("/{key}")
def get_config(key: str, session: Session = Depends(get_session)):
    return site_config_service.get_config(session, key)


@router.put("/{key}", response_model=SiteConfigOut)
def update_config(
    key: str,
    data: SiteConfigUpdate,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return site_config_service.update_config(session, key, data)


@router.put("")
def batch_update_config(
    configs: dict,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    return site_config_service.batch_update_config(session, configs)
