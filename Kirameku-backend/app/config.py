import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]

# 阿里云 OSS 配置
OSS_ACCESS_KEY_ID = os.environ["OSS_ACCESS_KEY_ID"]
OSS_ACCESS_KEY_SECRET = os.environ["OSS_ACCESS_KEY_SECRET"]
OSS_BUCKET_NAME = "hiromu520"
OSS_ENDPOINT = "oss-cn-beijing.aliyuncs.com"
OSS_CUSTOM_DOMAIN = "https://static.hiromu.top"
OSS_PREFIX = "Boke/"
