"""端到端验证：修复后的歌单每一首是否都能真正播出声。"""
import httpx

FRONT = "http://127.0.0.1:3000"
BACK = "http://127.0.0.1:8000"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"


def probe(u):
    try:
        r = httpx.get(u, headers={
            "User-Agent": UA, "Range": "bytes=0-2047",
            "Referer": "https://music.163.com/"},
            timeout=15, follow_redirects=True)
        return r.status_code, r.headers.get("content-type", "")[:28], len(r.content)
    except Exception as e:
        return type(e).__name__, "", 0


def main():
    print("=== A. 后台 music 表（应全为 netease，无 qq）===")
    rows = httpx.get(f"{BACK}/api/music/tracks", timeout=25).json()["data"]
    platforms = {r["platform"] for r in rows}
    print(f"  {len(rows)} 首，平台集合 = {platforms}")
    assert platforms == {"netease"}, "仍存在 qq 平台歌曲！"

    ids = ",".join(r["songId"] for r in rows)
    print("\n=== B. meting 解析后台歌曲 ===")
    got = httpx.get(f"{FRONT}/api/music", params={"ids": ids, "platform": "netease"},
                    timeout=90).json()
    gmap = {str(g["id"]): g for g in got}
    allok = True
    for r in rows:
        g = gmap.get(r["songId"])
        if not g or not g.get("src"):
            print(f"  FAIL {r['title'][:20]:22} 无 src")
            allok = False
            continue
        st, ct, n = probe(g["src"])
        ok = st in (200, 206)
        allok &= ok
        print(f"  {'OK  ' if ok else 'FAIL'} {r['title'][:20]:22} HTTP {st} {ct} {n}B")

    print("\n=== C. 网易云歌单 17943739323 ===")
    pl = httpx.get(f"{FRONT}/api/music", params={"id": "17943739323", "platform": "netease"},
                   timeout=120).json()
    print(f"  歌单 {len(pl)} 首")
    for g in pl:
        st, ct, n = probe(g["src"])
        ok = st in (200, 206)
        allok &= ok
        print(f"  {'OK  ' if ok else 'FAIL'} {g['title'][:20]:22} HTTP {st} {ct} {n}B")

    print("\n=== D. 播放器实际歌单（后台 + 歌单合并）===")
    total = len(rows) + len(pl)
    print(f"  前端应显示 {total} 首（{len(rows)} 后台手工+ {len(pl)} 歌单）")

    print(f"\n=== 总判定：{'全部可播' if allok else '存在不可播'} ===")


if __name__ == "__main__":
    main()