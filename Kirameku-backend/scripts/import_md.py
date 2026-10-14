# -*- coding: utf-8 -*-
"""
把 Kirameku/content/posts/*.md 里的 Markdown 文章导入数据库。

用法（在 Kirameku-backend 目录下）：
    venv/Scripts/python.exe scripts/import_md.py            # 导入全部
    venv/Scripts/python.exe scripts/import_md.py --dry-run  # 只看不写

特性：
- 解析 YAML front-matter（title/description/cover/category/tags/status/is_pinned/published_at|date/slug）
- 按 slug 幂等 upsert：重复执行只会更新，不会插出重复文章
- 自动创建缺失的分类 / 标签，并维护 post_count
- cover 指向的图片若在本地不存在，自动回退到 public/images 下的可用封面，避免裂图
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

import yaml
from sqlmodel import Session, select, func

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import engine  # noqa: E402
from app.models import Post, Category, Tag, PostTag  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
# 前端 public 目录（用于校验封面是否存在）
PUBLIC = ROOT.parent / "Kirameku" / "public"
CONTENT_DIR = ROOT.parent / "Kirameku" / "content" / "posts"

# cover 缺失时的兜底封面（public/images 下真实存在的图）
FALLBACK_COVERS = ["/images/34.webp", "/images/36.webp", "/images/39.webp", "/images/41.webp", "/images/55.webp"]

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?", re.S)


def parse_front_matter(text: str):
    m = FM_RE.match(text)
    if not m:
        return {}, text
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        print(f"  ! front-matter 解析失败：{e}")
        meta = {}
    return meta, text[m.end():]


def slugify(title: str, fallback: str) -> str:
    """优先用标题生成 ASCII slug；标题是纯中文时退回用文件名。

    注意：正则必须显式写 [a-zA-Z0-9]，不能用 反斜杠w —— Python 默认 Unicode 模式下它会匹配汉字。
    """

    def _ascii(v: str) -> str:
        return re.sub(r"[^a-zA-Z0-9-]+", "-", v).strip("-").lower()

    s = _ascii(title)
    if not s:  # 纯中文标题 -> 用文件名兜底
        s = _ascii(fallback)
    return s or fallback


def cover_ok(cover: str) -> bool:
    if not cover:
        return False
    rel = cover.lstrip("/")
    return (PUBLIC / rel).exists()


def calc_stats(content: str):
    wc = len([c for c in content if not c.isspace()])
    return wc, max(1, round(wc / 400))


def to_datetime(meta) -> datetime:
    raw = meta.get("published_at") or meta.get("date")
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str) and raw.strip():
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(raw.strip(), fmt)
            except ValueError:
                continue
    return datetime.now()


def upsert(session: Session, meta: dict, body: str, stem: str, idx: int, dry: bool):
    title = (meta.get("title") or stem).strip()
    # slug 优先级：front-matter 显式指定 > 文件名（更短更干净）> 标题转换
    slug = (meta.get("slug") or "").strip()
    if not slug:
        slug = slugify(stem, "") or slugify(title, stem)
    desc = (meta.get("description") or body.strip().split("\n")[0][:120]).strip()
    content = body.strip()
    cover = (meta.get("cover") or "").strip()

    if cover and not cover_ok(cover):
        print(f"  ! 封面 {cover} 不存在 -> 回退 {FALLBACK_COVERS[idx % len(FALLBACK_COVERS)]}")
        cover = FALLBACK_COVERS[idx % len(FALLBACK_COVERS)]
    if not cover:
        cover = FALLBACK_COVERS[idx % len(FALLBACK_COVERS)]

    cat_name = (meta.get("category") or "技术").strip()
    tags = [str(t).strip() for t in (meta.get("tags") or []) if str(t).strip()]
    status = (meta.get("status") or "published").strip()
    is_pinned = bool(meta.get("is_pinned", False))
    published_at = to_datetime(meta)
    wc, rt = calc_stats(content)

    cat = session.exec(select(Category).where(Category.name == cat_name)).first()
    if not cat:
        cat = Category(name=cat_name, slug=slugify(cat_name, "cat"), description="")
        session.add(cat)
        session.commit()
        session.refresh(cat)

    if dry:
        print(f"  [dry-run] 将导入：{title} (slug={slug}, 分类={cat_name}, 标签={tags})")
        return

    post = session.exec(select(Post).where(Post.slug == slug)).first()
    if post:
        post.title, post.description, post.content = title, desc, content
        post.cover, post.category_id = cover, cat.id
        post.status, post.is_pinned = status, is_pinned
        post.word_count, post.reading_time = wc, rt
        post.published_at, post.updated_at = published_at, datetime.now()
        session.add(post)
        session.flush()
        session.exec(select(PostTag).where(PostTag.post_id == post.id))  # 清旧关联
        action = "更新"
    else:
        post = Post(
            title=title, slug=slug, description=desc, content=content, cover=cover,
            category_id=cat.id, status=status, is_pinned=is_pinned,
            word_count=wc, reading_time=rt, published_at=published_at,
        )
        session.add(post)
        session.flush()
        action = "新增"

    # 重建标签关联
    existing = {row.tag_id for row in session.exec(select(PostTag).where(PostTag.post_id == post.id)).all()}
    for name in tags:
        tag = session.exec(select(Tag).where(Tag.name == name)).first()
        if not tag:
            tag = Tag(name=name, slug=slugify(name, "tag"))
            session.add(tag)
            session.commit()
            session.refresh(tag)
        if tag.id not in existing:
            session.add(PostTag(post_id=post.id, tag_id=tag.id))
    session.commit()
    print(f"  {action}：{title} (id={post.id}, {wc} 字, 状态={status})")


def recount(session: Session):
    for c in session.exec(select(Category)).all():
        c.post_count = session.exec(
            select(func.count(Post.id)).where(Post.category_id == c.id, Post.status == "published")
        ).one()
    for t in session.exec(select(Tag)).all():
        t.post_count = session.exec(
            select(func.count(PostTag.post_id))
            .join(Post, Post.id == PostTag.post_id)
            .where(PostTag.tag_id == t.id, Post.status == "published")
        ).one()
    session.commit()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(CONTENT_DIR.glob("*.md"))
    if not files:
        print(f"未在 {CONTENT_DIR} 找到任何 .md 文件")
        return
    print(f"发现 {len(files)} 个 Markdown 文件：")

    with Session(engine) as s:
        for i, f in enumerate(files):
            print(f"- {f.name}")
            meta, body = parse_front_matter(f.read_text(encoding="utf-8"))
            upsert(s, meta, body, f.stem, i, args.dry_run)
        if not args.dry_run:
            recount(s)
            total = s.exec(select(func.count(Post.id)).where(Post.status == "published")).one()
            print(f"完成。当前已发布文章 {total} 篇。")


if __name__ == "__main__":
    main()
