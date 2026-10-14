"""回填后台歌单的封面 / 专辑 / 时长。

背景：早期添加歌曲时没传 cover，数据库里这些字段是空串，前端列表就没图。
这里从本地 NCM API（3301）的 /song/detail 批量取信息回填。

用法：./venv/Scripts/python.exe scripts/fix_covers.py
"""

import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models.music import Music  # noqa: E402

NCM_API = "http://localhost:3301"
HEADERS = {"Referer": "https://music.163.com/", "User-Agent": "Mozilla/5.0"}


def fmt_duration(ms: int) -> str:
    s = int(ms or 0) // 1000
    return f"{s // 60}:{s % 60:02d}"


def main() -> None:
    with Session(engine) as session:
        songs = session.exec(select(Music).where(Music.platform == "netease")).all()
        ids = [s.song_id for s in songs]
        print(f"待处理网易云歌曲 {len(ids)} 首")

        if not ids:
            return

        detail: dict = {}
        try:
            r = httpx.get(
                f"{NCM_API}/song/detail",
                params={"ids": ",".join(ids)},
                headers=HEADERS,
                timeout=20,
            )
            detail = {str(x["id"]): x for x in (r.json().get("songs") or [])}
        except Exception as exc:  # noqa: BLE001
            print(f"拉取详情失败: {exc}")
            return

        fixed = 0
        for s in songs:
            d = detail.get(s.song_id)
            if not d:
                print(f"  ! {s.name} 无详情")
                continue
            al = d.get("al") or {}
            cover = str(al.get("picUrl") or "")
            if cover.startswith("http://"):
                cover = "https://" + cover[7:]
            album = str(al.get("name") or "")
            dur = fmt_duration(d.get("dt") or 0)
            ar = ", ".join(a.get("name", "") for a in (d.get("ar") or []))

            changed = []
            if cover and s.cover != cover:
                s.cover = cover
                changed.append("cover")
            if album and s.album != album:
                s.album = album
                changed.append("album")
            if dur and s.duration != dur:
                s.duration = dur
                changed.append("duration")
            if ar and s.artist != ar:
                s.artist = ar
                changed.append("artist")
            if changed:
                fixed += 1
                print(f"  + {s.name} <- {','.join(changed)}")

        session.commit()
        print(f"已更新 {fixed} 首")


if __name__ == "__main__":
    main()