import uuid
from io import BytesIO
from datetime import date
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from PIL import Image

from app.deps import get_current_user
from app.config import (
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET_NAME,
    OSS_ENDPOINT,
    OSS_CUSTOM_DOMAIN,
    OSS_PREFIX,
)

router = APIRouter(prefix="/api/upload", tags=["上传"])

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/svg+xml", "image/bmp", "image/x-icon",
}
MAX_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DIMENSION = 4096  # 单边最大像素，超过则等比压缩

# 本地存储目录（app/main.py 已挂载 /uploads 静态路由）
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def _oss_enabled() -> bool:
    """OSS 是否配置完整"""
    return all([
        OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET,
        OSS_BUCKET_NAME, OSS_ENDPOINT,
    ])


def _get_bucket():
    import oss2
    auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
    return oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME)


def _safe_ext(filename: str | None, content_type: str) -> str:
    """从文件名取扩展名并兜底，防止伪造扩展名"""
    ext = ""
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
    # 只保留常见图片后缀，其余按 content_type 推断
    if ext not in {"jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"}:
        mapping = {
            "image/jpeg": "jpg", "image/png": "png",
            "image/webp": "webp", "image/gif": "gif",
            "image/svg+xml": "svg", "image/bmp": "bmp",
            "image/x-icon": "ico",
        }
        ext = mapping.get(content_type, "png")
    return "jpg" if ext == "jpeg" else ext


def _compress(content: bytes, content_type: str) -> tuple[bytes, str]:
    """大图等比压缩，返回压缩后内容与实际格式。SVG/GIF 不处理"""
    if content_type in {"image/svg+xml", "image/gif"}:
        return content, content_type

    try:
        img = Image.open(BytesIO(content))
    except Exception:
        return content, content_type

    # 统一转为 RGB（处理 PNG 透明通道、CMYK 等）
    if img.mode not in {"RGB", "L"}:
        img = img.convert("RGB")

    w, h = img.size
    if max(w, h) > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    out = BytesIO()
    img.save(out, format="WEBP", quality=82, method=4)
    compressed = out.getvalue()

    # 压缩后比原图还大就保留原图
    if len(compressed) >= len(content):
        return content, content_type
    return compressed, "image/webp"


def _key_name() -> str:
    """按日期分目录，便于归档与排查"""
    today = date.today().strftime("%Y%m%d")
    return f"{today}/{uuid.uuid4().hex}"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    compress: bool = True,
    _: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")

    content = await file.read()
    if not content:
        raise HTTPException(400, "文件内容为空")
    if len(content) > MAX_SIZE:
        raise HTTPException(400, f"文件大小不能超过 {MAX_SIZE // 1024 // 1024}MB")

    # ---- 真实内容校验：不信 Content-Type 头 ----
    if file.content_type in {"image/svg+xml"}:
        # SVG 是文本格式，PIL 无法校验，单独做基本检查
        head = content[:512].lstrip().lower()
        if not head.startswith((b"<svg", b"<?xml")):
            raise HTTPException(400, "文件内容与声明的类型不符")
    else:
        try:
            img_verify = Image.open(BytesIO(content))
            img_verify.verify()
        except Exception:
            raise HTTPException(400, "文件内容不是有效的图片")

    # 方向检测（基于原始图）
    orientation = "landscape"
    try:
        img = Image.open(BytesIO(content))
        w, h = img.size
        orientation = "landscape" if w >= h else "portrait"
    except Exception:
        pass

    final_type = file.content_type
    if compress:
        content, final_type = _compress(content, file.content_type)

    ext = _safe_ext(None, final_type)
    name = _key_name()

    # ---- 优先 OSS，未配置则降级本地存储 ----
    if _oss_enabled():
        try:
            key = f"{OSS_PREFIX}{name}.{ext}"
            bucket = _get_bucket()
            bucket.put_object(key, content)
            domain = (OSS_CUSTOM_DOMAIN or "").rstrip("/")
            url = f"{domain}/{key}" if domain else f"https://{OSS_BUCKET_NAME}.{OSS_ENDPOINT}/{key}"
            return {"url": url, "orientation": orientation, "storage": "oss"}
        except Exception as e:
            # OSS 出错时降级本地，不中断用户操作
            pass

    # ---- 降级：存到本地 uploads 目录 ----
    local_dir = UPLOAD_DIR / Path(name).parent
    local_dir.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / f"{name}.{ext}").write_bytes(content)

    return {
        "url": f"/uploads/{name}.{ext}",
        "orientation": orientation,
        "storage": "local",
    }


@router.get("/storage")
def storage_info(_: dict = Depends(get_current_user)):
    """供管理后台展示当前图片存储策略"""
    return {
        "storage": "oss" if _oss_enabled() else "local",
        "oss_configured": _oss_enabled(),
    }
