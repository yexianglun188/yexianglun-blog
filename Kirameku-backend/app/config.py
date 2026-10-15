import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

# 允许跨域的前端来源：本地开发地址
# 公网访问无需在此列出 —— 浏览器请求同源 /api/*，由 Next.js 服务端 rewrites
# 转发到本进程，属服务端到服务端调用，不经浏览器 CORS 校验。
# 如需浏览器直连本后端，在 .env 的 CORS_ORIGINS 中追加来源（逗号分隔）。
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8000",
).split(",")

# GitHub OAuth
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

# 阿里云 OSS 配置
OSS_ACCESS_KEY_ID = os.environ["OSS_ACCESS_KEY_ID"]
OSS_ACCESS_KEY_SECRET = os.environ["OSS_ACCESS_KEY_SECRET"]
OSS_BUCKET_NAME = os.environ["OSS_BUCKET_NAME"]
OSS_ENDPOINT = os.environ["OSS_ENDPOINT"]
OSS_CUSTOM_DOMAIN = os.environ["OSS_CUSTOM_DOMAIN"]
OSS_PREFIX = os.environ["OSS_PREFIX"]
