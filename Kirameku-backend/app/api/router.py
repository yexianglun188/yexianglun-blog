"""汇总所有 API 子路由，main.py 只需 include_router(api_router) 即可"""

from fastapi import APIRouter

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
from app.api.bookmarks import router as bookmarks_router
from app.api.visitors import router as visitors_router
from app.api.dashboard import router as dashboard_router
from app.api.music_admin import router as music_admin_router
from app.api.music import router as music_router
from app.api.novel import router as novel_router
from app.api.dog_diary import router as dog_diary_router
from app.api.users_admin import router as users_admin_router
from app.api.notifications import router as notifications_router
from app.api.douban import router as douban_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(posts_router)
api_router.include_router(categories_router)
api_router.include_router(tags_router)
api_router.include_router(comments_router)
api_router.include_router(messages_router)
api_router.include_router(chatters_router)
api_router.include_router(albums_router)
api_router.include_router(projects_router)
api_router.include_router(friend_links_router)
api_router.include_router(site_config_router)
api_router.include_router(upload_router)
api_router.include_router(bookmarks_router)
api_router.include_router(visitors_router)
api_router.include_router(dashboard_router)
api_router.include_router(music_admin_router)
api_router.include_router(music_router)
api_router.include_router(novel_router)
api_router.include_router(dog_diary_router)
api_router.include_router(users_admin_router)
api_router.include_router(notifications_router)
api_router.include_router(douban_router)
