"""把周杰伦热门歌加入后台歌单（走 NCM API 取 id，先验证可播）。

用法（账号从环境变量读，不要写死在代码里）：

    ADMIN_PASS=你的密码 ./venv/Scripts/python.exe scripts/add_jay.py
"""
import os

import httpx

NCM = "http://127.0.0.1:3301"
BACK = "http://127.0.0.1:8000"
UA = "Mozilla/5.0"
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "")

# 已确认歌手为周杰伦的网易云 id（song/detail 核实过）
WANT = [
    ("186016", "晴天"),
    ("185809", "彩虹"),
    ("186009", "止战之殇"),
    ("185821", "最长的电影"),
]


def probe(u):
    try:
        r = httpx.get(u, headers={"User-Agent": UA, "Range": "bytes=0-32767"},
                      timeout=20, follow_redirects=True)
        return r.status_code, len(r.content)
    except Exception as e:
        return type(e).__name__, 0


def detail(sid):
    r = httpx.get(f"{NCM}/song/detail", params={"ids": sid, "cookie": ""},
                  headers={"User-Agent": UA}, timeout=25).json()
    s = r["songs"][0]
    art = "/".join(a["name"] for a in s.get("ar", []))
    return s["name"], art, s.get("album", {}).get("picUrl", "")


def main():
    if not ADMIN_PASS:
        print("请先设置管理员密码环境变量，例如：")
        print("  ADMIN_PASS=你的密码 ./venv/Scripts/python.exe scripts/add_jay.py")
        raise SystemExit(1)

    S = httpx.Client(timeout=60)
    tok = S.post(f"{BACK}/api/auth/login",
                 json={"username": ADMIN_USER, "password": ADMIN_PASS}).json()["data"]["accessToken"]
    H = {"Authorization": f"Bearer {tok}"}
    print("登录成功\n")

    for sid, expect in WANT:
        name, art, pic = detail(sid)
        if "周杰伦" not in art:
            print(f"跳过 {sid} 《{name}》歌手={art}")
            continue
        # 先验证能播
        try:
            u = httpx.get(f"{BACK}/api/music/url",
                          params={"platform": "netease", "songmid": sid}, timeout=90).json()
            url = u["data"]["url"]
        except Exception as e:
            print(f"《{name}》取流失败 {type(e).__name__}: {str(e)[:60]}")
            continue
        st, n = probe(url)
        print(f"《{name}》- {art}  可播探测 HTTP {st} {n}B")
        if st not in (200, 206):
            continue
        # 加入歌单
        payload = {"platform": "netease", "id": sid, "name": name,
                   "artist": art, "album": "", "cover": pic, "duration": ""}
        d = S.post(f"{BACK}/api/music-admin/add", json=payload, headers=H)
        print(f"   加入: HTTP {d.status_code} {d.text[:110]}")

    print("\n=== 最终歌单 ===")
    rows = httpx.get(f"{BACK}/api/music/tracks", timeout=25).json()["data"]
    for t in rows:
        print(f"  [{t['platform']:7}] {t['title'][:22]:24} {t['artist'][:18]:20} {t['songId']}")
    print(f"共 {len(rows)} 首")


if __name__ == "__main__":
    main()