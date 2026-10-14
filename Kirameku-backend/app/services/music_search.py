"""音乐搜索（双平台统一映射）

后台 `/api/music-admin/search` 和前台 `/api/music/search` 共用这一层，
区别只是后台多返回一个 `added` 标记（是否已入库）。

平台差异：
  - kuwo    ：走本地 NCM API Enhanced（3301）的 /kuwo/search
             这是**默认推荐源**。原因：网易云的搜索索引把周杰伦等高版权歌曲的
             原唱过滤掉了（搜「晴天」只出翻唱），但酷我索引完整，能直接搜到原唱。
  - netease ：走本地 NCM API Enhanced（3301）的 /cloudsearch；
             该服务不可用时回退到网易云公开 web 接口
  - qq     ：打本地 QQMusicApi（http://localhost:3300），
             需要已注入登录 cookie 才能拿到可播放的歌曲
"""

from typing import Any, Dict, List

import httpx

NETEASE_SEARCH_URL = "https://music.163.com/api/search/get/web"
NCM_API = "http://localhost:3301"
QQ_MUSIC_API = "http://localhost:3300"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://music.163.com/",
    "Accept": "application/json",
}

SUPPORTED_PLATFORMS = ("kuwo", "netease", "qq")


def _fmt_duration(seconds: int) -> str:
    seconds = int(seconds or 0)
    return f"{seconds // 60}:{seconds % 60:02d}"


def _https(url: str) -> str:
    """把 http:// 升级成 https://，否则在 https 页面里会被混合内容策略拦掉。"""
    return url.replace("http://", "https://", 1) if url.startswith("http://") else url


def _artists_str(raw: Any) -> str:
    """artists / ar 两种字段名都兼容。"""
    return ", ".join(
        a.get("name", "") for a in (raw or []) if isinstance(a, dict) and a.get("name")
    )


def _map_netease_song(s: Dict[str, Any]) -> Dict[str, Any]:
    """把网易云两种结构的搜索结果映射成统一格式。

    本地 NCM API 返回 ar / al，公开 web 接口返回 artists / album，两边字段名不同。
    """
    sid = str(s.get("id") or "")
    if not sid:
        return {}
    artists = s.get("artists") or s.get("ar") or []
    album = s.get("album") or s.get("al") or {}
    album_name = album.get("name", "") if isinstance(album, dict) else ""
    # 封面：本地 API 给完整 picUrl；公开接口只给 picId，需要自己拼 CDN 地址。
    cover = ""
    if isinstance(album, dict):
        cover = str(album.get("picUrl") or "")
        if not cover and album.get("picId"):
            cover = f"https://p1.music.126.net/{album['picId']}.jpg"
    return {
        "id": sid,
        "platform": "netease",
        "name": s.get("name") or "未知歌曲",
        "artist": _artists_str(artists),
        "album": album_name,
        "duration": _fmt_duration((s.get("duration") or 0) / 1000),
        "cover": _https(cover),
    }


def _sort_original_first(results: List[Dict[str, Any]], keyword: str) -> List[Dict[str, Any]]:
    """原唱优先排序。

    搜「周杰伦」时网易云会把翻唱 / 合唱版排在前面（版权下架后原唱专辑常被过滤），
    用户想听的原唱反而找不到。这里按三条规则打分排序：
      1. 歌手名完全等于关键词          → 分数最高
      2. 歌名完全等于关键词            → 很高
      3. 含"(Live)" / "翻唱" / "cover" → 往后压
    """
    kw = (keyword or "").strip()
    if not kw:
        return results

    def score(r: Dict[str, Any]) -> tuple:
        artist = (r.get("artist") or "").split(",")[0].strip()
        name = (r.get("name") or "").strip()
        penalty = 1 if any(t in name for t in ("(Live)", "（Live）", "翻唱", "Cover")) else 0
        if artist == kw:
            return (0, penalty)
        if name == kw:
            return (1, penalty)
        if kw in name:
            return (2, penalty)
        return (3, penalty)

    return sorted(results, key=score)


def search_netease(keyword: str, limit: int = 20) -> List[Dict[str, Any]]:
    """网易云搜索，返回统一结构。

    优先走本地 NCM API（3301）——它带完整封面 picUrl；
    服务没起来时回退到网易云公开 web 接口（封面靠 picId 拼）。
    """
    results: List[Dict[str, Any]] = []

    try:
        resp = httpx.get(
            f"{NCM_API}/cloudsearch",
            params={"keywords": keyword, "type": 1, "limit": limit},
            headers=HEADERS,
            timeout=15,
        )
        if resp.status_code == 200:
            songs = ((resp.json().get("result") or {}).get("songs")) or []
            for s in songs:
                item = _map_netease_song(s)
                if item:
                    results.append(item)
    except (httpx.RequestError, ValueError):
        pass

    if not results:
        try:
            resp = httpx.get(
                NETEASE_SEARCH_URL,
                params={"s": keyword, "type": 1, "offset": 0, "limit": limit},
                headers=HEADERS,
                timeout=15,
                follow_redirects=True,
            )
        except httpx.RequestError as exc:
            raise ConnectionError(f"无法连接网易云：{exc}") from exc

        if resp.status_code != 200:
            raise ConnectionError(f"网易云返回异常：HTTP {resp.status_code}")

        try:
            songs = resp.json().get("result", {}).get("songs", []) or []
        except ValueError:
            songs = []

        for s in songs:
            item = _map_netease_song(s)
            if item:
                results.append(item)

    return _sort_original_first(results, keyword)[:limit]


def search_kuwo(keyword: str, limit: int = 20) -> List[Dict[str, Any]]:
    """酷我搜索（走本地 NCM API 的 /kuwo/search 补丁路由）。

    酷我索引没被版权方下架，所以周杰伦之类的原唱能直接搜到，
    这是本项目当前的**首选搜索源**。
    """
    try:
        resp = httpx.get(
            f"{NCM_API}/kuwo/search",
            params={"key": keyword, "limit": limit},
            headers=HEADERS,
            timeout=15,
        )
    except httpx.RequestError as exc:
        raise ConnectionError(f"无法连接本地音乐服务（{NCM_API}）：{exc}") from exc

    if resp.status_code != 200:
        raise ConnectionError(f"本地音乐服务返回 HTTP {resp.status_code}")

    try:
        songs = ((resp.json().get("data") or {}).get("songs")) or []
    except ValueError as exc:
        raise ConnectionError("本地音乐服务返回了非 JSON 数据") from exc

    return _sort_original_first(list(songs), keyword)[:limit]


async def search_qq(keyword: str, limit: int = 20) -> List[Dict[str, Any]]:
    """QQ 音乐搜索（走本地 QQMusicApi），返回统一结构"""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                f"{QQ_MUSIC_API}/search",
                params={"key": keyword, "pageNo": 1, "pageSize": limit, "t": 0},
                headers={"Referer": "https://y.qq.com/", "User-Agent": HEADERS["User-Agent"]},
            )
    except httpx.RequestError as exc:
        raise ConnectionError(f"无法连接本地 QQ 音乐服务（{QQ_MUSIC_API}）：{exc}") from exc

    if resp.status_code != 200:
        raise ConnectionError(f"QQ 音乐服务返回 HTTP {resp.status_code}")

    try:
        payload = resp.json()
    except ValueError as exc:
        raise ConnectionError("QQ 音乐服务返回了非 JSON 数据") from exc

    raw_list = ((payload.get("data") or {}).get("list")) or []
    results = []
    for s in raw_list:
        mid = str(s.get("songmid") or "").strip()
        if not mid:
            continue
        singers = s.get("singer") or []
        album_mid = s.get("albummid") or ""
        results.append(
            {
                "id": mid,          # QQ 用 songmid 作为唯一标识
                "platform": "qq",
                "name": s.get("songname") or "未知歌曲",
                "artist": ", ".join(
                    x.get("name", "") for x in singers if isinstance(x, dict) and x.get("name")
                ),
                "album": s.get("albumname") or "",
                "duration": _fmt_duration(s.get("interval") or 0),
                # QQ 封面：搜索接口不直接给封面字段，用 albummid 拼官方图片 CDN。
                # 注意路径必须是 photo_new，老文档里的 photo_500 已 404。
                "cover": f"https://y.gtimg.cn/music/photo_new/T002R300x300M000{album_mid}.jpg" if album_mid else "",
            }
        )
    return results


async def search(keyword: str, platform: str, limit: int = 20) -> List[Dict[str, Any]]:
    platform = (platform or "kuwo").lower().strip()
    if platform not in SUPPORTED_PLATFORMS:
        raise ValueError(f"不支持的平台: {platform}，可选 {SUPPORTED_PLATFORMS}")
    if platform == "kuwo":
        return search_kuwo(keyword, limit)
    if platform == "netease":
        return search_netease(keyword, limit)
    return await search_qq(keyword, limit)
