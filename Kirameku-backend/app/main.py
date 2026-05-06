from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS
from app.database import init_db
from app.api.auth import router as auth_router
from app.api.posts import router as posts_router
from app.api.categories import router as categories_router
from app.api.tags import router as tags_router
from app.api.comments import router as comments_router
from app.api.messages import router as messages_router
from app.api.chatters import router as chatters_router
from app.api.albums import router as albums_router
from app.api.projects import router as projects_router
from app.api.friend_links import router as friend_links_router
from app.api.site_config import router as site_config_router
from app.api.upload import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Kirameku Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(categories_router)
app.include_router(tags_router)
app.include_router(comments_router)
app.include_router(messages_router)
app.include_router(chatters_router)
app.include_router(albums_router)
app.include_router(projects_router)
app.include_router(friend_links_router)
app.include_router(site_config_router)
app.include_router(upload_router)

# 挂载上传文件目录
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# 挂载 Vue 管理后台
admin_dist = Path(__file__).resolve().parent.parent / "admin" / "dist"
if admin_dist.exists():
    app.mount("/admin", StaticFiles(directory=str(admin_dist), html=True), name="admin")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/routes")
def get_routes():
    return {"code": 0, "message": "success", "data": []}
