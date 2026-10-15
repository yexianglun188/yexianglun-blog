"""音乐管理（酷我 + 网易云）

数据落地在 music 表（platform + song_id + 可空 media_url）。
播放链接都带时效，不落库，播放时由 /api/music/url 动态取。

为兼容旧前端契约，网易云的歌曲仍会镜像一份到 site_config 的
cloud_music_ids / cloud_music_meta。
"""

import time
from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.deps import get_current_user, get_session
from app.models.music import Music
from app.models.site_config import SiteConfig
from app.services import music_search

router = APIRouter(prefix="/api/music-admin", tags=["音乐管理"])

SUPPORTED_PLATFORMS = ("kuwo", "netease")

IDS_KEY = "cloud_music_ids"
META_KEY = "cloud_music_meta"


# ── site_config 镜像（仅网易云，兼容旧契约）────────────────
def _read_cfg(session: Session, key: str) -> str:
    cfg = session.exec(select(SiteConfig).where(SiteConfig.key == key)).first()
    return cfg.value if cfg else ""


def _write_cfg(session: Session, key: str, value: str, description: str) -> None:
    cfg = session.exec(select(SiteConfig).where(SiteConfig.key == key)).first()
    if cfg:
        cfg.value = value
        if not cfg.description:
            cfg.description = description
    else:
        cfg = SiteConfig(key=key, value=value, description=description)
    session.add(cfg)
    session.commit()


def _mirror_netease(session: Session) -> None:
    """把库里的网易云歌曲镜像回 site_config，保证旧接口/旧缓存页面不炸"""
    rows = session.exec(
        select(Music).where(Music.platform == "netease").order_by(Music.sort.desc(), Music.id.desc())
    ).all()
    ids = [r.song_id for r in rows]
    meta = [
        {"id": r.song_id, "name": r.name, "artist": r.artist}
        for r in rows
    ]
    _write_cfg(session, IDS_KEY, json.dumps(ids, ensure_ascii=False), "网易云歌曲ID列表（由音乐管理页自动维护）")
    _write_cfg(session, META_KEY, json.dumps(meta, ensure_ascii=False), "已选歌曲元信息（由音乐管理页自动维护）")


def _row(m: Music) -> Dict[str, Any]:
    return {
        "id": m.song_id,
        "platform": m.platform,
        "name": m.name,
        "artist": m.artist,
        "album": m.album,
        "cover": m.cover,
        "duration": m.duration,
        "media_url": m.media_url or "",
    }


# ── 搜索（按平台分发）───────────────────────────────────
@router.get("/search")
async def search_songs(
    keyword: str = Query(..., min_length=1, max_length=50),
    platform: str = Query("netease", description="netease | kuwo"),
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    """按歌名搜索，platform 决定走网易云还是酷我索引"""
    platform = (platform or "netease").lower().strip()
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"不支持的平台: {platform}，可选 {SUPPORTED_PLATFORMS}")

    # 已入库的歌曲用于回显「已添加」
    added = {
        r.song_id
        for r in session.exec(select(Music).where(Music.platform == platform)).all()
    }

    try:
        results = await music_search.search(keyword, platform, limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    for r in results:
        r["added"] = r["id"] in added
    return results


# ── 已选歌曲 ────────────────────────────────────────────
@router.get("/list")
def list_songs(
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    rows = session.exec(select(Music).order_by(Music.sort.desc(), Music.id.desc())).all()
    return [_row(m) for m in rows]


@router.post("/add")
def add_song(
    payload: dict = Body(...),
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    """添加一首歌

    body: {id, name, artist, platform, album, cover, duration}
    id：歌曲 id（酷我 / 网易云均为各自平台的歌曲 id）
    """
    platform = str(payload.get("platform") or "netease").lower().strip()
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"不支持的平台: {platform}")

    song_id = str(payload.get("id") or payload.get("songmid") or "").strip()
    if not song_id:
        raise HTTPException(status_code=400, detail="缺少歌曲 id")

    exists = session.exec(
        select(Music).where(Music.platform == platform, Music.song_id == song_id)
    ).first()
    if exists:
        return {"ok": True, "duplicated": True, "total": _count(session)}

    # 新歌排最前：取当前最大 sort + 1
    top = session.exec(select(Music).order_by(Music.sort.desc())).first()
    song = Music(
        platform=platform,
        song_id=song_id,
        name=str(payload.get("name") or "未知歌曲"),
        artist=str(payload.get("artist") or ""),
        album=str(payload.get("album") or ""),
        cover=str(payload.get("cover") or ""),
        duration=str(payload.get("duration") or ""),
        media_url=None,          # 播放链接都带时效，统一播放前动态取
        sort=(top.sort + 1) if top else 0,
    )
    session.add(song)
    session.commit()

    _mirror_netease(session)
    return {"ok": True, "duplicated": False, "total": _count(session)}


@router.delete("/{platform}/{song_id}")
def remove_song(
    platform: str,
    song_id: str,
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    row = session.exec(
        select(Music).where(Music.platform == platform, Music.song_id == song_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="歌曲不存在")
    session.delete(row)
    session.commit()
    _mirror_netease(session)
    return {"ok": True, "total": _count(session)}


@router.post("/clear")
def clear_songs(
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    """清空已选歌曲（回到只放歌单的状态）"""
    for row in session.exec(select(Music)).all():
        session.delete(row)
    session.commit()
    _mirror_netease(session)
    return {"ok": True, "total": 0}


def _count(session: Session) -> int:
    return len(session.exec(select(Music)).all())
