"""把 public/images 下的照片录入相册（幂等：相同 url 不重复插入）。

分组沿用原 photos.ts 的日期归类，剩余散图归入「更多回忆」相册。
"""
import os
from PIL import Image

from sqlmodel import Session, select

from app.database import engine
from app.models import Album, Photo

# 后端脚本的同级前端目录：Kirameku/Kirameku/public/images
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CANDIDATES = [
    os.path.join(_BACKEND_ROOT, "public", "images"),
    os.path.join(_BACKEND_ROOT, "..", "Kirameku", "public", "images"),
    os.path.join(_BACKEND_ROOT, "..", "Kirameku-backend", "public", "images"),
]
PUBLIC_IMAGES = next((p for p in _CANDIDATES if os.path.isdir(p)), _CANDIDATES[0])

# 相册定义：(标题, [文件名列表])
GROUPS = [
    ("2024年12月27日", ["119.webp", "121.webp", "127.webp", "130.webp", "133.webp", "134.webp"]),
    ("2024年12月15日", ["55.webp", "57.webp", "58.webp", "60.webp", "61.webp", "63.webp"]),
    ("2024年12月14日", ["20.webp", "34.webp", "36.webp", "39.webp", "41.webp", "42.webp"]),
]


def detect_orientation(path: str) -> str:
    try:
        with Image.open(path) as img:
            w, h = img.size
        if h > w:
            return "portrait"
        if abs(w - h) <= max(w, h) * 0.05:
            return "square"
        return "landscape"
    except Exception:
        return "landscape"


def get_or_create_album(session: Session, title: str, cover: str, sort: int) -> Album:
    existing = session.exec(select(Album).where(Album.title == title)).first()
    if existing:
        return existing
    album = Album(title=title, description="", cover=cover, photo_count=0, sort=sort)
    session.add(album)
    session.commit()
    session.refresh(album)
    return album


def add_photo_if_absent(session: Session, album: Album, filename: str, sort: int) -> bool:
    url = f"/images/{filename}"
    exists = session.exec(select(Photo).where(Photo.url == url)).first()
    if exists:
        return False
    path = os.path.join(PUBLIC_IMAGES, filename)
    orientation = detect_orientation(path) if os.path.exists(path) else "landscape"
    photo = Photo(album_id=album.id, url=url, caption="", orientation=orientation, sort=sort)
    session.add(photo)
    return True


def main():
    if not os.path.isdir(PUBLIC_IMAGES):
        print(f"未找到图片目录: {PUBLIC_IMAGES}")
        return

    all_files = sorted(
        f for f in os.listdir(PUBLIC_IMAGES) if f.lower().endswith((".webp", ".jpg", ".jpeg", ".png"))
    )
    grouped = {f for _, files in GROUPS for f in files}
    extra = [f for f in all_files if f not in grouped]

    groups = list(GROUPS)
    if extra:
        groups.append(("更多回忆", extra))

    added_total = 0
    with Session(engine) as session:
        for idx, (title, files) in enumerate(groups):
            # 第一个相册设为最高 sort，让首页预览默认展示它
            sort = 100 - idx
            cover_url = f"/images/{files[0]}" if files else ""
            album = get_or_create_album(session, title, cover_url, sort)
            added = 0
            for i, fn in enumerate(files):
                if add_photo_if_absent(session, album, fn, i):
                    added += 1
            if added:
                session.commit()
            # 重新统计 photo_count（覆盖历史数据不一致的相册）
            count = session.exec(
                select(Photo).where(Photo.album_id == album.id)
            ).all()
            album.photo_count = len(count)
            album.updated_at = __import__("datetime").datetime.now()
            session.add(album)
            session.commit()
            added_total += added
            print(f"相册「{title}」: 共 {len(count)} 张，本次新增 {added} 张")

    print(f"\n完成，累计新增照片 {added_total} 张。")


if __name__ == "__main__":
    main()
