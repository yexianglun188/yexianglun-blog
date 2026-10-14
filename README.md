<div align="center">

# yexianglun

**叶湘伦 —— 取自《不能说的秘密》里，那个弹钢琴的男生**

一个从零搭建的全栈个人博客系统，前端 Next.js，后端 FastAPI，附带 Vue 管理后台。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## 效果展示

<div align="center">
  <img src="docs/images/首页.png" width="90%" />
  <img src="docs/images/文章.png" width="90%" />
  <img src="docs/images/说说.png" width="90%" />
  <img src="docs/images/照片墙.png" width="90%" />
  <img src="docs/images/归档.png" width="90%" />
</div>

---

## 项目结构

```
.
├── Kirameku/                      # 前端（Next.js App Router）
│   ├── app/                       # 页面路由
│   │   ├── novel/                 # 小说书城（分类 → 搜索 → 目录 → 阅读）
│   │   ├── bookmark/              # 收藏夹（站点导航）
│   │   ├── posts/                 # 文章系统
│   │   ├── moments/               # 说说
│   │   ├── friends/               # 友链（漂流瓶主题）
│   │   ├── music/                 # 音乐播放器
│   │   └── ...                    # 更多页面
│   ├── components/                # UI 组件
│   │   ├── layout/                # 导航栏、页脚
│   │   ├── music/                 # 播放器、封面降级
│   │   ├── providers/             # 主题、音乐、上下文
│   │   └── ui/                    # 通用组件
│   └── siteConfig.ts              # 站点全局配置
│
└── Kirameku-backend/              # 后端（FastAPI）
    ├── app/
    │   ├── api/                   # RESTful API 接口
    │   ├── models/                # SQLModel 数据模型
    │   ├── schemas/               # Pydantic 请求/响应模型
    │   └── services/              # 业务逻辑层
    ├── admin/                     # 管理后台（Vue 3 + Element Plus）
    └── init_db.sql                # 数据库初始化脚本
```

## 技术栈

<table>
<tr>
<td width="50%" valign="top">

**前端**
- **Next.js 16** + **React 19** — App Router，SSR/SSG
- **Tailwind CSS 4** — 原子化样式
- **Framer Motion** — 页面过渡与微交互
- **TypeScript** — 类型安全
- **Live2D** — 看板娘，右下角可互动

</td>
<td width="50%" valign="top">

**后端**
- **FastAPI** — 高性能 Python Web 框架
- **SQLModel** — ORM（SQLAlchemy + Pydantic）
- **PostgreSQL** — 关系型数据库
- **阿里云 OSS** — 图片对象存储
- **JWT** — 身份认证

</td>
</tr>
<tr>
<td width="50%" valign="top">

**管理后台**
- **Vue 3** + **Element Plus** — 后台 UI
- **Pure Admin** — 管理后台模板
- 内嵌于后端，无需单独部署

</td>
<td width="50%" valign="top">

**阅读服务**
- **自研小说爬虫** — Python / FastAPI
- 抓取公开免费站点 quanben.io（全本小说网）
- 分类浏览、关键词搜索、章节正文
- 内嵌于后端，无需单独部署

</td>
</tr>
</table>

## 功能模块

### 博客前台

| 模块 | 路径 | 描述 |
|:-----|:-----|:-----|
| 首页 | `/` | 文章预览、说说、照片墙，一站式入口 |
| 文章 | `/posts` | 分类筛选、标签、Markdown 渲染、代码高亮 |
| 说说 | `/moments` | 碎片化记录，类朋友圈时间线 |
| 杂谈 | `/messages` | 轻量话题讨论区 |
| 小说 | `/novel` | 17 个分类浏览、关键词搜索、目录分页、沉浸式阅读（字号/行距/主题可调） |
| 收藏夹 | `/bookmark` | 站点导航，分类管理，平台标签，自动获取 favicon |
| 项目 | `/projects` | 个人项目展示，支持搜索，GitHub/Gitee 链接 |
| 友链 | `/friends` | 漂流瓶主题，可拖动交互 |
| 照片墙 | `/photowall` | 相册瀑布流展示 |
| 归档 | `/timeline` | 时间河流可视化，拖动浏览全部文章 |
| 音乐 | `/music` | 酷我音乐搜歌（可切网易云），320k MP3，歌词滚动 + 全屏沉浸歌词 |
| 关于 | `/about` | 关于博主 |

### 管理后台

文章、分类、标签、评论、留言、说说、相册、项目、友链、收藏夹、站点配置 — 全部可视化管理，支持图片压缩上传至阿里云 OSS。

## 快速开始

### 1. 后端

```bash
cd Kirameku-backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库、密钥、OSS 等配置

# 初始化数据库
psql -U postgres -d your_db -f init_db.sql

# 打包管理后台
cd admin && pnpm install && pnpm build && cd ..

# 启动
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API 文档：`http://localhost:8000/docs`
管理后台：`http://localhost:8000/admin`

### 2. 前端

```bash
cd Kirameku

pnpm install
pnpm dev                          # 开发模式 → http://localhost:3000

# 部署
pnpm build && pnpm start
```

### 3. 阅读服务（已内嵌，无需单独部署）

小说模块由后端 `app/services/novel_crawler.py` 直接抓取公开免费站点
（quanben.io 全本小说网），通过 `/api/novel/*` 提供分类、搜索、目录与正文，
不再需要外部的 reader-master / reader3（8085）服务。

### 4. 音乐服务（可选，仅使用搜歌播放时需要）

音乐播放器采用 **自建取流 + 跨平台解灰** 的方案：前端只跟自己的后端说话，
后端再向本地音乐服务要播放地址，最后经本站代理转发给浏览器。

```bash
git clone https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git E:\liu\ncm-api
cd E:\liu\ncm-api
npm install
start-music.bat          # 一键启动，端口 3301
```

启动脚本已设好两个必要环境变量：

| 变量 | 值 | 作用 |
|:-----|:---|:-----|
| `ENABLE_GENERAL_UNBLOCK` | `true` | 网易云直连拿不到版权资源时，跨平台找同名单曲替代源 |
| `ENABLE_FLAC` | `false` | 强制 320k MP3。Chromium 桌面版不解 FLAC，拿到 `x-flac` 会直接报错并自动跳歌 |

**为什么选酷我作为搜索源**：网易云的搜索索引把高版权歌曲的原唱过滤掉了
（搜「周杰伦」返回的 30 首里没有《晴天》《七里香》），而酷我索引完整；
取流侧则由解灰引擎负责，命中率最高的音源恰好也是酷我。

**歌词**：酷我的歌词接口需要 csrf token（拿不到），所以借网易云的歌词 ——
先用 `cloudsearch` 定位歌手 id，再用 `/artist/songs` 拿到他完整的曲目列表
（这个接口不受下架影响），最后 `/lyric?id=` 取词。合唱曲会先按
`& / , / 、` 拆开歌手逐个匹配。

> 已放弃 QQ 音乐：vkey 有效期短、且 VIP 版权拦截严重（实测随机 25 首仅 1 首可播），
> 相关代码仅作兼容保留。

## 环境变量

`Kirameku-backend/.env`：

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
SECRET_KEY=your-secret-key

# 阿里云 OSS
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_ENDPOINT=oss-cn-xxx.aliyuncs.com
OSS_BUCKET=your-bucket-name
```

## 设计亮点

- **音乐播放器** — 酷我搜歌 + 跨平台解灰取流，浏览器端 CORS 由后端流式代理统一解决
- **Glassmorphism 风格** — 全站毛玻璃质感，亮色暗色双主题
- **微交互动画** — Framer Motion 驱动，页面过渡、卡片悬停、果冻弹跳
- **小说阅读系统** — 自研 Python 爬虫抓取公开免费站点（分类/搜索/目录/正文），阅读设置本地持久化
- **收藏夹** — 自动获取站点 favicon，平台标签，搜索过滤
- **漂流瓶友链** — 可拖动的漂浮瓶子，点击查看详情
- **时间河流** — 归档页的可视化时间线，拖动交互
- **Live2D 看板娘** — 右下角可互动，连续点击 Logo 7 次触发彩蛋
- **移动端适配** — 响应式布局，移动端导航菜单

## License

MIT


