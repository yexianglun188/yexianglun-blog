"""回填酷我歌曲的封面（旧格式全 404 的那批）。

背景：kuwo-patch.js 早期把封面拼成
  https://img4.kuwo.cn/star/albumcover/{ALBUMID}.jpg
这个格式已全站 404。正确格式要用搜索结果里的 `web_albumpic_short`：
  https://img4.kuwo.cn/star/albumcover/120/s4s81/2/3200337129.jpg

数据库里修复前入库的酷我歌存的是旧格式，这里按「歌名」重新搜一次酷我、
取新格式封面回填。

用法：./venv/Scripts/python.exe scripts/fix_kuwo_covers.py
"""

import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models.music import Music  # noqa: E402

BACKEND = "http://127.0.0.1:8000"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# 旧格式的特征：albumcover 后面直接跟纯数字 id
OLD_MARK = "/star/albumcover/"


def probe(url: str) -> bool:
    """封面地址是否真的能取到图。"""
    if not url:
        return False
    try:
        r = httpx.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        return r.status_code == 200 and r.headers.get("content-type", "").startswith("image")
    except httpx.RequestError:
        return False


def main() -> None:
    with Session(engine) as session:
        songs = session.exec(select(Music).where(Music.platform == "kuwo")).all()
        print(f"酷我歌曲 {len(songs)} 首\n")

        fixed = 0
        for m in songs:
            if probe(m.cover):
                print(f"  ✓ {m.name} 封面正常")
                continue

            # 封面不可用 → 按歌名重新搜一次拿新格式地址
            try:
                r = httpx.get(
                    f"{BACKEND}/api/music/search",
                    params={"key": m.name, "platform": "kuwo", "limit": 10},
                    headers=HEADERS,
                    timeout=30,
                )
                rows = (r.json().get("data")) or []
            except Exception as exc:  # noqa: BLE001
                print(f"  ! {m.name} 搜索失败: {exc}")
                continue

            # 优先选歌手也对得上的那条
            hit = next(
                (x for x in rows
                 if x.get("cover") and m.artist and m.artist.split("&")[0] in (x.get("artist") or "")),
                None,
            ) or next((x for x in rows if x.get("cover")), None)

            if not hit:
                print(f"  ! {m.name} 未找到可用封面")
                continue
            if not probe(hit["cover"]):
                print(f"  ! {m.name} 新地址仍不可用: {hit['cover'][:60]}")
                continue

            m.cover = hit["cover"]
            # 顺带把专辑/时长也校正一下
            if hit.get("album"):
                m.album = hit["album"]
            if hit.get("duration"):
                m.duration = hit["duration"]
            fixed += 1
            print(f"  + {m.name} -> {hit['cover'][:66]}")

        session.commit()
        print(f"\n已修复 {fixed} 首")


if __name__ == "__main__":
    main()