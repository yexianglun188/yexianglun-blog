# Kirameku - 个人博客系统

> Kirameku（きらめく）在日语里是"闪烁"的意思，就像夜空中最亮的那颗星。

这是一个从零开始搭建的全栈个人博客系统，前端用 Next.js，后端用 FastAPI，还附带了一个 Vue 写的管理后台。整个项目的目的很简单：做一个好看、好用、属于自己的博客。

## 项目长什么样

```
.
├── Kirameku/                  # 前端（Next.js）
│   ├── app/                   # 页面路由，用的 App Router
│   ├── components/            # 各种组件，按功能分了文件夹
│   ├── public/                # 静态资源，图片、Live2D 模型什么的
│   └── siteConfig.ts          # 站点配置，改这里就能改网站信息
│
└── Kirameku-backend/          # 后端（FastAPI）
    ├── app/                   # API 服务
    │   ├── api/               # 所有接口都在这
    │   ├── models/            # 数据库模型
    │   └── main.py            # 启动入口
    ├── admin/                 # 管理后台（Vue 3），嵌套在后端里
    └── .env                   # 密钥配置，不会提交到 Git
```

## 用了什么技术

**前端**
- Next.js 16 + React 19 — 主框架，用的 App Router
- Tailwind CSS 4 — 写样式超级方便
- Framer Motion — 页面动画，让一切动起来
- Live2D — 看板娘，放在右下角卖萌

**后端**
- FastAPI — Python Web 框架，速度快
- SQLModel — ORM，结合了 SQLAlchemy 和 Pydantic
- PostgreSQL — 数据库
- 阿里云 OSS — 图片存储

**管理后台**
- Vue 3 + Element Plus — 后台 UI
- Pure Admin — 后台模板框架

## 怎么跑起来

### 第一步：后端

```bash
cd Kirameku-backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（重要！）
cp .env.example .env
# 然后打开 .env，把里面的值换成你自己的
# 数据库连接、密钥、OSS 配置都在这里

# 打包管理后台
cd admin
pnpm install
pnpm build                      # 产出 dist/ 目录，后端会自动挂载
cd ..

# 启动！
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

启动后访问 `http://localhost:8000/docs` 可以看到 API 文档。
管理后台在 `http://localhost:8000/admin`（需要先打包 admin）。

### 第二步：前端

```bash
cd Kirameku

# 安装依赖
pnpm install

# 开发模式
pnpm dev                        # 打开 http://localhost:3000

# 打包部署
pnpm build
pnpm start
```

## 环境变量说明

在 `Kirameku-backend/.env` 里配置，没有这些服务跑不起来：

```env
# 数据库连接
DATABASE_URL=postgresql://用户名:密码@地址:端口/数据库名

# JWT 密钥，随便填一个复杂的字符串
SECRET_KEY=your-secret-key

# 阿里云 OSS（图片上传用的）
OSS_ACCESS_KEY_ID=your-aliyun-access-key-id
OSS_ACCESS_KEY_SECRET=your-aliyun-access-key-secret
```

## 管理后台怎么用

管理后台是嵌套在后端项目里的，不需要单独部署。你只需要：

1. 进入 `admin/` 目录
2. 执行 `pnpm build`
3. 生成的 `dist/` 目录会被后端自动挂载到 `/admin` 路径

就这么简单，不用配置 Nginx，不用单独起服务。

## 页面介绍

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 博客的门面，展示最新文章、说说和照片墙预览 |
| 文章 | `/posts` | 文章列表，支持分类筛选，点击进入详情页 |
| 说说 | `/moments` | 类似朋友圈，记录碎片化的想法 |
| 杂谈 | `/chatter` | 轻松的话题，随想随写 |
| 项目 | `/projects` | 展示个人项目，支持搜索，附带 GitHub/Gitee 链接 |
| 友链 | `/friends` | 漂流瓶主题，每个朋友是一个漂浮在海面上的瓶子，可以拖动 |
| 照片墙 | `/photowall` | 相册展示，瀑布流布局 |
| 归档 | `/timeline` | 时间河流可视化，拖动浏览所有文章 |
| 音乐 | `/music` | 云音乐播放器，支持歌单 |
| 关于 | `/about` | 关于博主 |

## 一些细节

- 前端的站点信息都在 `siteConfig.ts` 里，改这里就行
- 后端的 API 文档自动生成，访问 `/docs`
- 图片上传会自动压缩并传到阿里云 OSS
- 支持亮色/暗色主题切换
- 有看板娘（Live2D），在右下角可以互动

## License

MIT
