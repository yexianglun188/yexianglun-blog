"""音乐公开接口（前台播放器消费）

两个用途：
  1. GET /api/music/tracks  后台「音乐管理」添加的歌曲
  2. GET /api/music/url     播放前动态取真实播放流地址

取流主链路是本地部署的 NeteaseCloudMusicApi Enhanced（3301）：
它带ENABLE_GENERAL_UNBLOCK 全局解灰，能在网易云直连拿不到 VIP 资源时
跨平台（酷我/咪咕等）找同名单曲的替代源，实测周杰伦原唱可正常播放。
"""

import json
import random
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.deps import get_session
from app.models.music import Music
from app.services import music_search

router = APIRouter(prefix="/api/music", tags=["音乐"])

# 本地部署的 NeteaseCloudMusicApi Enhanced，默认端口 3301。
# 必须以 ENABLE_GENERAL_UNBLOCK=true 启动，否则 VIP 歌曲拿不到地址。
NCM_API = "http://localhost:3301"

# 备用：旧版QQMusicApi（jsososo/QQMusicApi），默认端口 3300。
# 仅在需要 QQ 歌词时用到，它的取流能力已经很弱（VIP 基本拿不到）。
QQ_MUSIC_API = "http://localhost:3300"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://y.qq.com/",
}

# 流地址有时效，缓存 5 分钟；过期后前端下次播放会自动重新取
_URL_TTL = 5 * 60
_url_cache: Dict[str, tuple[float, str]] = {}

# 解灰返回的地址多来自酷我/咪咕等第三方 CDN，可能是 http://，
# 浏览器在 https 页面里加载 http 音频会被混合内容策略拦掉，统一升级成 https。
def _https(url: str) -> str:
    return url.replace("http://", "https://", 1) if url.startswith("http://") else url


def _ncm_json(path: str, **params) -> Optional[Dict[str, Any]]:
    """调用本地 NCM API，拿 JSON；失败返回 None。"""
    params.setdefault("cookie", "")
    try:
        resp = httpx.get(f"{NCM_API}{path}", params=params,
                         headers=HEADERS, timeout=20)
    except httpx.RequestError:
        return None
    if resp.status_code != 200:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


def _probe(url: str) -> bool:
    """用 Range 请求探测地址是否真的能取到音频数据。"""
    if not url:
        return False
    try:
        resp = httpx.get(url, headers={**HEADERS, "Range": "bytes=0-4095"},
                         timeout=12, follow_redirects=True)
    except httpx.RequestError:
        return False
    return resp.status_code in (200, 206)


def _ncm_unblock(song_id: str) -> Optional[str]:
    """调本地 NCM API 的解灰接口跨平台找替代源。"""
    payload = _ncm_json("/unblock", id=song_id)
    if not payload:
        return None
    data = payload.get("data")
    url = data.get("url") if isinstance(data, dict) else None
    return _https(url) if url else None


def _resolve_netease_url(song_id: str) -> str:
    """网易云取流：普通接口优先，拿不到就解灰。"""
    # 1) 普通接口（有登录态时音质最好）
    payload = _ncm_json("/song/url/v1", id=song_id, br=320000)
    data = (payload or {}).get("data") or []
    item = data[0] if data else {}
    url = item.get("url") or ""
    # freeTrialInfo 非空说明只是试听片段（30~45秒），仍优先尝试解灰拿完整版
    if url and not item.get("freeTrialInfo"):
        url = _https(url)
        if _probe(url):
            return url

    # 2) 解灰：跨平台找同名单曲（实测周杰伦原唱可播）
    alt = _ncm_unblock(song_id)
    if alt and _probe(alt):
        return alt

    if url:
        return url
    raise HTTPException(
        status_code=502,
        detail="这首歌暂时无法播放（各平台均无可用音源）",
    )


# QQ 现在对不同歌曲可用的码率并不一致：320k/500k 常常只拿到 purl 但 CDN 回 404，
# 而部分歌曲（尤其老专辑母带）反而能正常播。所以这里按「先高音质、失败降码率」
# 的顺序逐个尝试，并且每个候选地址都实际探测一次（Range 请求 0-0），
# 只把真正返回 200 的地址交给前端，避免浏览器拿到死链后静默没声音。
_QUALITY_CDN = (
    # (filename 前缀, 是否探测)  —— 顺序即优先级
    ("M800", True),   # 320k mp3
    ("M500", True),   # 128k mp3
    ("C400", True),   # 400k m4a（部分歌曲只有 flac/ape 之外的 AAC 资源）
    ("M800", False),  # 高码率 purl 存在但探测失败时的兜底，直接给地址
)
_PROBE_TIMEOUT = 8.0


def _lyric_from_netease(song_id: str) -> str:
    """从本地 NCM API 取歌词原文，取不到返回空串。"""
    if not song_id:
        return ""
    payload = _ncm_json("/lyric", id=song_id)
    lrc = ((payload or {}).get("lrc") or {}).get("lyric")
    return str(lrc or "")


def _lyric_cache_key(platform: str, mid: str) -> str:
    return f"lrc:{platform}:{mid}"


def _artist_id_from_search(artist: str) -> str:
    """用 cloudsearch 找歌手 id。

    周杰伦这类高版权歌手的单曲在网易云搜索索引里被整批移除（搜「周杰伦」
    返回的 30 首里根本没有七里香/晴天），但歌手本身还能搜到，
    so 先从结果里的 artists/ar 拿到 artistId，再去查他的完整曲目列表。
    """
    if not artist:
        return ""
    payload = _ncm_json("/cloudsearch", keywords=artist, type=1, limit=10)
    songs = (payload or {}).get("result", {}).get("songs") or []
    for s in songs:
        for a in (s.get("artists") or s.get("ar") or []):
            if isinstance(a, dict) and str(a.get("name", "")) == artist:
                return str(a.get("id") or "")
    # 单曲搜不到就按歌手类型再搜一次
    payload = _ncm_json("/cloudsearch", keywords=artist, type=100, limit=5)
    artists = (payload or {}).get("result", {}).get("artists") or []
    for a in artists:
        if isinstance(a, dict) and str(a.get("name", "")) == artist:
            return str(a.get("id") or "")
    return ""


def _split_artists(raw: str) -> List[str]:
    """把合唱歌手名拆成单个歌手。

    酷我给的是 `周杰伦&Lara梁心颐` 这种连写形式，而网易云里歌手是分开存的
    （"周杰伦" 和 "Lara梁心颐" 两条），拿整串去比对永远对不上 ——
    这就是《珊瑚海》等合唱曲拿不到歌词的原因。
    """
    text = re.sub(r"[&,，、/／+＋]|\s+feat\.?\s*|\s+ft\.?\s*", "|", raw or "",
                  flags=re.I)
    seen: List[str] = []
    for part in text.split("|"):
        p = part.strip()
        if p and p not in seen:
            seen.append(p)
    return seen


def _lyric_for_kw_song(name: str, artist: str) -> str:
    """给酷我的歌找歌词。

    酷我自己的歌词接口全挂（官网要 csrf token，bd-api.kuwo.cn 的
    /api/play/music/lyric 等路由都是 -404），所以借网易云的歌词。

    关键点：**网易云的 cloudsearch 搜不到周杰伦这些歌**，但
    `/artist/songs` 能拿到他完整的曲目列表，而 `/lyric?id=` 是按 id
    取词的、不受下架影响。所以路线是：
      cloudsearch 找到任一歌手 id → /artist/songs 拿全部曲目
      → 精确匹配歌名 → /lyric
    """
    name = (name or "").strip()
    if not name:
        return ""

    artists = _split_artists(artist)

    # 1) 逐个歌手去他的曲目列表里精确找（最准，能找回归档歌曲）
    for one in artists:
        artist_id = _artist_id_from_search(one)
        if not artist_id:
            continue
        payload = _ncm_json("/artist/songs", id=artist_id, limit=100)
        songs = payload.get("songs") or [] if payload else []
        hit = next((s for s in songs if str(s.get("name", "")) == name), None)
        if hit:
            lrc = _lyric_from_netease(str(hit.get("id") or ""))
            if lrc:
                return lrc

    # 2) 兜底：cloudsearch 搜「歌名 + 歌手」，要求歌名一致，
    #    且结果里任一歌手能对上（合唱曲按单个歌手比对）。
    payload = _ncm_json("/cloudsearch", keywords=f"{name} {artists[0] if artists else ''}".strip(),
                        type=1, limit=10)
    songs = (payload or {}).get("result", {}).get("songs") or []

    def _names_of(s: Dict[str, Any]) -> List[str]:
        ar = s.get("artists") or s.get("ar") or []
        return [str(a.get("name", "")) for a in ar if isinstance(a, dict)]

    for s in songs:
        if str(s.get("name", "")) != name:
            continue
        # 歌手一个都对不上就跳过，避免串到翻唱版
        if artists and not any(a in _names_of(s) for a in artists):
            continue
        return _lyric_from_netease(str(s.get("id") or ""))
    return ""


def _resolve_kuwo_url(song_id: str) -> str:
    """酷我取流：走本地 NCM API 的 /kuwo/url。

    该路由复用 @unblockneteasemusic 的 bodian provider，
    已被我们在 kuwo-patch.js 里强制成 320k mp3（M800），避开 FLAC。
    """
    payload = _ncm_json("/kuwo/url", id=song_id)
    data = (payload or {}).get("data") or {}
    url = data.get("url") if isinstance(data, dict) else None
    if not url:
        raise HTTPException(status_code=502, detail="这首歌暂时无法播放（酷我音源无资源）")
    return _https(url)


def _proxy_url(url: str) -> str:
    """把第三方 CDN 直链改写成本站的流代理地址。

    酷我 CDN（bd-*.kuwo.cn）不返回 Access-Control-Allow-Origin，
    浏览器 <audio> 直接加载会被 CORS 拦掉；网易云部分资源同理。
    经本站代理转发后由后端补CORS 头，前端拿到的是同源地址。
    """
    if not url:
        return url
    # 已经是本站地址就别再套一层
    if url.startswith("/api/") or "/api/music/audio" in url:
        return url
    return f"/api/music/audio?url={quote(url, safe='')}"


def _probe_playable(url: str) -> bool:
    """用 Range 请求探测音频地址是否真的能取到数据。"""
    try:
        resp = httpx.get(
            url,
            headers={**HEADERS, "Range": "bytes=0-1023"},
            timeout=_PROBE_TIMEOUT,
            follow_redirects=True,
        )
    except httpx.RequestError:
        return False
    # 206 Partial Content / 200 OK 都算可播；416 说明 vkey 完全失效
    return resp.status_code in (200, 206)


def _cached_url(key: str, producer) -> str:
    now = time.time()
    hit = _url_cache.get(key)
    if hit and now - hit[0] < _URL_TTL:
        return hit[1]
    value = producer()
    _url_cache[key] = (now, value)
    return value


def _qq_vkey(mid: str, prefix: str) -> Optional[dict]:
    """向 QQ 上游请求 vkey，返回 midurlinfo 那一条（失败返回 None）。"""
    filename = f"{prefix}{mid}.mp3"
    guid = str(random.randint(1000000, 9999999))
    payload = {
        "-": "getplaysongvkey",
        "g_tk": 5381,
        "loginUin": 0,
        "hostUin": 0,
        "format": "json",
        "inCharset": "utf8",
        "outCharset": "utf-8",
        "notice": 0,
        "platform": "yqq.json",
        "needNewCode": 0,
        "data": json.dumps({
            "req_0": {
                "module": "vkey.GetVkeyServer",
                "method": "CgiGetVkey",
                "param": {
                    "filename": [filename],
                    "guid": guid,
                    "songmid": [mid],
                    "songtype": [0],
                    "uin": "0",
                    "loginflag": 1,
                    "platform": "20",
                },
            },
            "comm": {"uin": "0", "format": "json", "ct": 19, "cv": 0},
        }),
    }
    try:
        resp = httpx.get(
            "https://u.y.qq.com/cgi-bin/musicu.fcg",
            params=payload,
            headers={**HEADERS, "Origin": "https://y.qq.com"},
            timeout=15,
        )
    except httpx.RequestError:
        return None
    if resp.status_code != 200:
        return None
    try:
        outer = resp.json()
        raw = outer["req_0"]["data"]
        inner = raw if isinstance(raw, dict) else json.loads(raw)
        items = inner.get("midurlinfo") or []
    except (ValueError, KeyError, TypeError):
        return None
    if not items:
        return None
    item = dict(items[0])
    # 关键：CDN 域名列表在响应的【顶层 data.sip】，不在 midurlinfo[0].sip
    # （后者恒为空数组）。读错位置会导致 purl 有值但一个候选地址都拼不出来。
    item["sip"] = inner.get("sip") or item.get("sip") or []
    return item


def _qq_playlist_url(mid: str, quality: str) -> Optional[str]:
    """优先走本地 QQMusicApi（它可能带了已登录 cookie），拿它的完整地址。"""
    try:
        resp = httpx.get(
            f"{QQ_MUSIC_API}/song/url",
            params={"id": mid, "type": quality},
            headers=HEADERS,
            timeout=15,
            follow_redirects=False,
        )
        if resp.status_code != 200:
            return None
        payload = resp.json()
        if payload.get("result") != 100 or not payload.get("data"):
            return None
        return str(payload["data"])
    except (httpx.RequestError, ValueError):
        return None


def _resolve_qq_play_url(mid: str) -> str:
    """按「本地服务 → 直连上游多码率探测」的顺序找一条真正能播的地址。"""
    # 1) 本地 QQMusicApi（登录态可用时它最准）
    for quality in ("320", "128", "flac"):
        url = _qq_playlist_url(mid, quality)
        if url:
            url = url.replace("http://", "https://", 1)
            if _probe_playable(url):
                return url

    # 2) 直连 QQ 上游：多码率 + 多 CDN 逐个探测
    fallback = ""
    for prefix, probe in _QUALITY_CDN:
        info = _qq_vkey(mid, prefix)
        if not info or not info.get("purl"):
            continue
        hosts = info.get("sip") or []
        for host in hosts:
            candidate = host + info["purl"]
            candidate = candidate.replace("http://", "https://", 1)
            if probe:
                if _probe_playable(candidate):
                    return candidate
            elif not fallback:
                fallback = candidate
    if fallback:
        return fallback

    raise HTTPException(
        status_code=502,
        detail="这首歌暂时无法播放（QQ 版权限制或无可用码率），试试切到网易云来源",
    )


def _row_to_track(m: Music) -> Dict[str, Any]:
    return {
        "id": f"{m.platform}:{m.song_id}",   # 全局唯一，前端直接当 key 用
        "platform": m.platform,
        "songId": m.song_id,                 # 网易云 id / QQ songmid
        "title": m.name,
        "artist": m.artist,
        "album": m.album,
        "cover": m.cover,
        "duration": m.duration,
        "src": m.media_url or "",            # QQ 音乐为空，需动态取
    }


@router.get("/tracks")
def list_tracks(session: Session = Depends(get_session)):
    """已添加的歌曲列表（按 sort 倒序，后加的排前面）"""
    rows = session.exec(select(Music).order_by(Music.sort.desc(), Music.id.desc())).all()
    return {"isSuccess": True, "data": [_row_to_track(m) for m in rows]}


@router.get("/search")
async def search_songs(
    key: str = Query(..., min_length=1, description="歌曲关键词"),
    platform: str = Query("netease", description="netease | qq"),
    limit: int = Query(20, ge=1, le=50),
):
    """前台搜歌（无需登录）

    访客搜到的歌只加入当前会话的播放列表，不写入 music 表，
    避免前台随意添加污染后台 curated 列表。
    """
    try:
        results = await music_search.search(key, platform, limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"isSuccess": True, "data": results}


@router.get("/url")
def resolve_url(
    platform: str = Query(..., description="kuwo | netease | qq"),
    songmid: str = Query(..., description="酷我/网易云传歌曲 id；QQ 传 songmid"),
):
    """解析真实播放地址。

    - netease：走本地 NCM API，普通接口拿不到就解灰（VIP 曲也能播）
    - qq：多码率 + 多 CDN 逐个探测（能力已很弱，仅保留兼容）

    酷我 / 网易云解灰拿到的都是第三方 CDN 地址，浏览器直接放进`<audio src>`
    会被 CORS 拦掉，所以统一包一层本站流代理（/api/music/audio）再交给前端。
    """
    platform = (platform or "").lower().strip()
    mid = (songmid or "").strip()
    if not mid:
        raise HTTPException(status_code=400, detail="缺少 song id")

    if platform == "kuwo":
        url = _cached_url(f"kw:{mid}", lambda: _resolve_kuwo_url(mid))
        return {"isSuccess": True, "data": {"url": _proxy_url(url)}}

    if platform == "netease":
        url = _cached_url(f"ne:{mid}", lambda: _resolve_netease_url(mid))
        return {"isSuccess": True, "data": {"url": _proxy_url(url)}}

    if platform != "qq":
        raise HTTPException(status_code=400, detail=f"不支持的平台: {platform}")

    def produce() -> str:
        return _resolve_qq_play_url(mid)

    url = _cached_url(f"qq:{mid}", produce)
    return {"isSuccess": True, "data": {"url": _proxy_url(url)}}


@router.get("/lyric")
def resolve_lyric(
    platform: str = Query(..., description="kuwo | netease | qq"),
    songmid: str = Query(..., description="酷我/网易云传歌曲 id；QQ 传 songmid"),
    name: str = Query("", description="歌名（酷我按歌名去网易云匹配歌词时需要）"),
    artist: str = Query("", description="歌手（同上）"),
):
    """获取 LRC 歌词文本。

    - netease：走本地 NCM API /lyric
    - kuwo：酷我自己的歌词接口要 csrf token（拿不到），所以用「歌名 + 歌手」
      去网易云 cloudsearch 找最相近的一首，再取它的歌词
    - qq：本地 QQMusicApi（3300）
    """
    platform = (platform or "").lower().strip()
    mid = (songmid or "").strip()

    if platform == "netease":
        return {"isSuccess": True, "data": {"lrc": _lyric_from_netease(mid)}}

    if platform == "kuwo":
        return {"isSuccess": True, "data": {"lrc": _lyric_for_kw_song(name, artist)}}

    if platform != "qq":
        raise HTTPException(status_code=400, detail=f"不支持的平台: {platform}")
    if not mid:
        raise HTTPException(status_code=400, detail="缺少 songmid")

    try:
        resp = httpx.get(
            f"{QQ_MUSIC_API}/lyric",
            params={"songmid": mid},
            headers=HEADERS,
            timeout=15,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"无法连接本地 QQ 音乐服务(3300)：{exc}") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"QQ 音乐服务返回 HTTP {resp.status_code}")

    try:
        payload = resp.json()
    except ValueError:
        return {"isSuccess": True, "data": {"lrc": "", "trans": ""}}

    # QQMusicApi 成功时返回 {result: 100, data: {lyric: "<LRC 文本>", trans: "<译文 LRC>"}}
    # 注意：lyric/trans 都是明文，不是 base64
    data = payload.get("data")
    if isinstance(data, dict):
        lrc = str(data.get("lyric") or "")
        trans = str(data.get("trans") or "")
    else:
        lrc, trans = "", ""
    return {"isSuccess": True, "data": {"lrc": lrc, "trans": trans}}


# ── 音频代理 ────────────────────────────────────────────────
# 解灰拿到的地址有两个硬伤，浏览器里都放不出来：
#   1. 酷我 CDN 不返回 Access-Control-Allow-Origin，<audio> 跨域加载会被拦；
#   2. 它给的是 FLAC（audio/x-flac），Chrome 桌面版只解 mp3/aac/opus/wav，FLAC 直接报错。
# 所以这里做一层流式代理：后端转发字节（顺带补 CORS 头），
# 由我们决定给前端声明成什么格式。
#
# ⚠️ 安全：必须限制只代理已知音乐 CDN，防止被当成任意 URL 代理滥用。
_ALLOWED_AUDIO_HOSTS = (
    "kuwo.cn",           # 解灰首选源 unm（酷我）
    "music.126.net",     # 网易云自家 CDN
    "126.net",           # 网易云兜底
    "qq.com",            # QQ 音乐 CDN
    "kugou.com",         # 酷狗 CDN
)


def _host_allowed(url: str) -> bool:
    from urllib.parse import urlparse
    host = (urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in _ALLOWED_AUDIO_HOSTS)


@router.get("/audio")
def proxy_audio(
    url: str = Query(..., description="音频直链（仅限已知音乐 CDN）"),
    request: Request = None,  # type: ignore[assignment]
):
    """音频流代理：解决 CDN 跨域的问题。

    酷我 CDN（bd-*.kuwo.cn）不返回 Access-Control-Allow-Origin，
    浏览器把它的地址直接塞进 <audio src> 会被 CORS 拦掉（表现为没声音）；
    这里由后端转发字节并补 CORS 头，前端拿到的就是同源地址。

    Range 必须原样透传给上游：<audio> 靠它做 seek，
    写死或缺失都会让部分 CDN 直接返回 416。
    """
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="非法的音频地址")
    if not _host_allowed(url):
        raise HTTPException(status_code=403, detail="该音频来源不在允许列表内")

    target = url.replace("http://", "https://", 1)
    headers = {**HEADERS, "Accept": "*/*"}
    if request is not None:
        rng = request.headers.get("range")
        if rng:
            headers["Range"] = rng

    # ⚠️ 关键：整段只发【一次】上游请求。
    # 早期实现先 httpx.stream 取响应头（probe），再在生成器里重新请求拉字节，
    # 等于一次客户端请求打两次上游 —— <audio> 的每次 32KB 起播缓冲 / seek
    # 都要付两次握手代价（实测 231ms vs 直连 CDN 的 126ms）。
    # 这里改用 client.send(stream=True) 拿到 Response 对象后：
    # 状态码和响应头已经可读，字节流交给生成器消费，用完在 finally 里关闭。
    client = httpx.Client(timeout=httpx.Timeout(30.0, read=60.0), follow_redirects=True)
    try:
        req = client.build_request("GET", target, headers=headers)
        upstream = client.send(req, stream=True)

        if upstream.status_code not in (200, 206):
            upstream.close()
            client.close()
            raise HTTPException(
                status_code=502, detail=f"上游返回 {upstream.status_code}")

        ctype = upstream.headers.get("content-type", "audio/mpeg")
        # 上游若真给了 FLAC，如实声明（解灰侧已强制 mp3，这里只是兜底）。
        if "flac" in ctype.lower():
            ctype = "audio/flac"

        out_headers = {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
        }
        # 把上游的 Range / Content-Range / Content-Length 传给浏览器，
        # 否则 <audio> 会因为拿不到 206 信息而无法 seek。
        for src, dst in (
            ("content-range", "Content-Range"),
            ("content-length", "Content-Length"),
            ("accept-ranges", "Accept-Ranges"),
        ):
            v = upstream.headers.get(src)
            if v:
                out_headers[dst] = v

        def gen():
            try:
                for chunk in upstream.iter_bytes(64 * 1024):
                    yield chunk
            finally:
                upstream.close()
                client.close()

        return StreamingResponse(
            gen(),
            status_code=upstream.status_code,
            media_type=ctype.split(";")[0],
            headers=out_headers,
        )
    except httpx.RequestError as exc:
        client.close()
        raise HTTPException(status_code=502, detail=f"音频代理失败: {exc}") from exc
