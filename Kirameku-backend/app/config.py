import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

# 允许跨域的前端来源：本地 + cpolar 内网穿透公网地址
# （cpolar 免费版重启后随机域名会变，新域名要么改这里要么写进 .env 的 CORS_ORIGINS）
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,https://b04a0eb.r21.cpolar.top",
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
