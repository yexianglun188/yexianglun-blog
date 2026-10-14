"""用酷我源把周杰伦原唱加进歌单，并核对可播性。

背景：网易云的 cloudsearch 索引把原唱过滤掉了（搜「晴天」只出翻唱），
所以后台已有的周杰伦条目是靠脚本硬塞 id 进去的。这脚本改成走酷我源，
顺带验证「搜到 → 取到流 → 真的能出声」这条链路。

用法（账号从环境变量读，不要写死在代码里）：

    ADMIN_USER=admin ADMIN_PASS=你的密码 \\
        ./venv/Scripts/python.exe scripts/add_jay_kuwo.py
"""

import os
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

BACKEND = "http://127.0.0.1:8000"
# 管理员凭据从环境变量读取，避免把密码提交进仓库
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "")

# 想加的周杰伦专辑曲名（酷我里能搜到原唱）
WANTED = ["晴天", "彩虹", "七里香", "稻香", "青花瓷", "夜曲", "安静", "起风了"]

HEADERS = {"User-Agent": "Mozilla/5.0"}


def fmt(ms: int) -> str:
    s = int(ms or 0) // 1000
    return f"{s // 60}:{s % 60:02d}"


def probe(url: str) -> str:
    """经本站代理探测，返回状态描述。"""
    try:
        r = httpx.get(
            f"{BACKEND}{url}",
            headers={**HEADERS, "Range": "bytes=0-8191"},
            timeout=30,
        )
        ctype = r.headers.get("content-type", "?")
        return f"HTTP {r.status_code} {ctype} {len(r.content)}B"
    except Exception as exc:  # noqa: BLE001
        return f"ERR {exc}"


def main() -> None:
    if not ADMIN_PASS:
        print("请先设置管理员密码环境变量，例如：")
        print("  ADMIN_PASS=你的密码 ./venv/Scripts/python.exe scripts/add_jay_kuwo.py")
        raise SystemExit(1)

    with httpx.Client(timeout=30) as c:
        tok = c.post(
            f"{BACKEND}/api/auth/login",
            json={"username": ADMIN_USER, "password": ADMIN_PASS},
            headers=HEADERS,
        ).json()["data"]["accessToken"]
        auth = {"Authorization": f"Bearer {tok}", **HEADERS}

        existing = c.get(f"{BACKEND}/api/music/tracks").json()["data"]
        print(f"当前歌单{len(existing)} 首\n")

        for name in WANTED:
            res = c.get(
                f"{BACKEND}/api/music/search",
                params={"key": name, "platform": "kuwo", "limit": 6},
            ).json()["data"]

            # 只认周杰伦的，且不是Live / 翻唱 / 女声版
            hit = next(
                (
                    r
                    for r in res
                    if "周杰伦" in (r.get("artist") or "")
                    and not any(t in (r.get("name") or "") for t in ("(Live)", "（Live）", "版)", "原唱"))
                ),
                None,
            )
            if not hit:
                print(f"  {name:<6} 未找到周杰伦原唱（跳过）")
                continue

            if any(
                e["title"] == hit["name"] and e["artist"] == hit["artist"]
                for e in existing
            ):
                print(f"  {name:<6} 已在歌单：{hit['name']} / {hit['artist']}")
                continue

            r = c.post(
                f"{BACKEND}/api/music-admin/add",
                json={
                    "id": hit["id"],
                    "platform": "kuwo",
                    "name": hit["name"],
                    "artist": hit["artist"],
                    "album": hit.get("album") or "",
                    "cover": hit.get("cover") or "",
                    "duration": hit.get("duration") or "",
                },
                headers=auth,
            )
            if r.status_code != 200:
                print(f"  {name:<6} 添加失败: {r.text[:120]}")
                continue

            # 立刻验证能不能出声
            u = c.get(
                f"{BACKEND}/api/music/url",
                params={"platform": "kuwo", "songmid": hit["id"]},
            ).json()
            play = u.get("data", {}).get("url", "")
            state = probe(play) if play else "无播放地址"
            print(f"  + {hit['name']:<8} | {hit['artist']:<8} | {hit.get('album', '')[:14]:<14} | {state}")


if __name__ == "__main__":
    main()