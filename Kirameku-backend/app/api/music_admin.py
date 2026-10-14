"""音乐管理（双平台：网易云 + QQ 音乐）

数据落地在 music 表（platform + song_id + 可空 media_url）。
QQ 音乐的播放链接带 vkey 有时效，不落库，播放时由 /api/music/url 动态取。

为兼容旧前端契约，网易云的歌曲仍会镜像一份到 site_config 的
cloud_music_ids / cloud_music_meta（QQ 歌曲不镜像，因为 meting 解析不了）。
"""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.deps import get_current_user, get_session
from app.models.music import Music
from app.models.site_config import SiteConfig
from app.services import music_search

router = APIRouter(prefix="/api/music-admin", tags=["音乐管理"])

SUPPORTED_PLATFORMS = ("kuwo", "netease", "qq")

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
    platform: str = Query("netease", description="netease | qq"),
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session),
    _: dict = Depends(get_current_user),
):
    """按歌名搜索，platform 决定走网易云还是本地 QQ 音乐服务"""
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
    id：网易云传数字 id，QQ 传 songmid
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
        media_url=None,          # QQ 的 vkey 链接不落库；网易云由 /api/music 动态解析
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


# ── QQ 音乐登录态（vkey 必须）────────────────────────────
@router.get("/qq-status")
async def qq_status(_: dict = Depends(get_current_user)):
    """查看本地 QQ 音乐服务的登录态

    注意：不能调 QQMusicApi 的 /user/cookie —— 那个返回的是「网站自己的 cookie jar」，
    而不是 /song/url 真正消费的「服务端注入 cookie」（data/cookie.json）。
    所以这里直接读 data/cookie.json（可用环境变量 QQ_MUSIC_DATA_DIR 覆盖路径）。
    """
    cookie_file = Path(os.environ.get("QQ_MUSIC_DATA_DIR", r"E:\liu\QQMusicApi\data")) / "cookie.json"

    cookie: Dict[str, Any] = {}
    if cookie_file.exists():
        try:
            cookie = json.loads(cookie_file.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            cookie = {}

    uin = str(cookie.get("uin") or "")
    has_key = bool(cookie.get("qqmusic_key") or cookie.get("qm_keyst"))
    expires_at = int(cookie.get("psrf_access_token_expiresAt") or 0)

    if not uin:
        hint = "尚未注入 QQ 音乐登录 cookie，QQ 歌曲将无法播放"
    elif not has_key:
        hint = "cookie 里缺少 qqmusic_key，QQ 歌曲将无法播放，请重新注入完整 cookie"
    elif expires_at and expires_at < int(time.time()):
        hint = "登录态已过期（psrf_access_token 到期），请重新去 y.qq.com 复制 cookie 注入"
    else:
        hint = ""

    return {
        "online": bool(uin and has_key),
        "uin": uin,
        "hasVkeyCredential": has_key,
        "expiresAt": expires_at,
        "hint": hint,
    }


@router.post("/qq-cookie")
async def set_qq_cookie(
    payload: dict = Body(...),
    _: dict = Depends(get_current_user),
):
    """把 QQ 音乐网页版的 cookie 注入本地 QQMusicApi 服务

    body: {cookie: "uin=123456; qqmusic_key=xxx; ..."}
    获取方式：浏览器登录 y.qq.com → F12 → Network → 任一个请求的 Cookie 整条复制
    """
    cookie = str(payload.get("cookie") or "").strip()
    if not cookie:
        raise HTTPException(status_code=400, detail="cookie 不能为空")
    if "uin=" not in cookie:
        raise HTTPException(status_code=400, detail="cookie 里找不到 uin，请从 y.qq.com 复制完整 cookie")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{QQ_MUSIC_API}/user/setCookie", json={"data": cookie})
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502, detail=f"无法连接本地 QQ 音乐服务（{QQ_MUSIC_API}）：{exc}"
        ) from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"QQ 音乐服务返回 HTTP {resp.status_code}")

    try:
        result = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="QQ 音乐服务返回了非 JSON 数据")

    return {"ok": result.get("result") == 100, "message": result.get("data") or "已注入"}


def _count(session: Session) -> int:
    return len(session.exec(select(Music)).all())
