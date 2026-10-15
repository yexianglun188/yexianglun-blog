# 云服务器部署说明

Ubuntu 22.04/24.04 + Docker Compose，一条命令起全部服务。

## 服务器目录结构

上传后在服务器上长这样（相对位置不能变，compose 用的是相对路径）：

```
/opt/kirameku/
├── Kirameku/          前端源码
│   └── public/        live2d / images / audio 三个素材目录（只读挂载进容器）
├── Kirameku-backend/  后端源码，含 admin/dist（管理后台）
├── ncm-api/           音乐服务（可选）
├── deploy/            ← 所有运维操作都在这个目录执行
│   ├── docker-compose.yml
│   ├── nginx.conf
│   ├── music.Dockerfile
│   ├── .env.prod          真实配置，不入库
│   ├── .env.prod.example  模板
│   ├── db-init/           首次启动自动导入的数据库备份
│   └── scripts/
└── ...
```

## 服务清单

| 容器 | 内部端口 | 说明 | 是否必须 |
|:---|:---|:---|:---|
| `kirameku-nginx` | 80 ← 对外 | 反向代理 + 静态素材直出 | 是 |
| `kirameku-frontend` | 3000 | Next.js 生产模式 | 是 |
| `kirameku-backend` | 8000 | FastAPI / 管理后台 / 上传目录 | 是 |
| `kirameku-db` | 5432 | PostgreSQL 16 | 是 |
| `kirameku-music` | 3301 | 音乐取流，默认不启动 | 否 |

公网只需要放行 **80** 端口，其余端口不对外暴露（`/api`、`/uploads`、`/admin` 都由前端容器在内部转发）。

## 首部署流程

### 1. 本机打包

```bash
cd E:/liu/Kirameku
bash deploy/scripts/pack-local.sh
```

产出两个包（在 `E:/liu/_deploy/`）：

- `kirameku-code.tar.gz` —— 代码 + 音乐服务 + 数据库备份，约 40MB
- `kirameku-assets.tar.gz` —— public 素材，约 230MB（可稍后再传）

分两个包的原因：素材大且不影响启动，先传代码把站点跑起来更稳。

### 2. 上传

先配好 SSH 免密登录（本机 `~/.ssh/id_ed25519.pub` 追加到服务器 `~/.ssh/authorized_keys`）：

```bash
ssh-copy-id root@<服务器IP>
```

然后：

```bash
bash deploy/scripts/upload-to-server.sh <服务器IP> root
```

没有 `ssh-copy-id` 的话，手动把公钥内容贴到服务器上 `~/.ssh/authorized_keys` 末尾即可。

### 3. 服务器执行部署

```bash
cd /opt/kirameku/deploy
bash scripts/server-first-deploy.sh
```

脚本会自动：装 Docker → 配镜像加速 → 小内存机器加 swap → 建 swap → 复制音乐服务 Dockerfile → 生成 `.env.prod` → 构建启动 → 健康检查。

**⚠️ 最后一步必须手动**：去云厂商控制台的安全组/防火墙里放行 **80 端口**，否则外网打不开。

### 4. 启动音乐服务（可选）

```bash
docker compose --profile music up -d --build
```

## 日常运维

全部在 `/opt/kirameku/deploy/` 下执行：

```bash
docker compose ps                  # 查看状态
docker compose logs -f backend     # 看后端日志
docker compose restart frontend    # 重启单个服务
docker compose down                # 停掉（数据卷保留）
```

### 更新代码

改完代码在本机 push 到 GitHub，然后在服务器：

```bash
cd /opt/kirameku/deploy
# 方式一：重新上传 code 包解压后重建
docker compose up -d --build

# 方式二：服务器直接拉仓库（若已配置 git）
# cd /opt/kirameku && git pull
```

只改了 `public/` 素材的话，**不用重建镜像**，重新 rsync 素材目录即可（卷是只读挂载的实时生效）。

### 改配置

```bash
nano deploy/.env.prod
docker compose up -d    # 无需 --build
```

`POSTGRES_PASSWORD` 特殊：只在数据库卷为空的首次启动生效。上线后要改必须连带清卷，先备份。

## 常见坑

| 现象 | 原因 | 处理 |
|:---|:---|:---|
| 构建时 `frontend` 容器被 kill | 内存不足（Next 构建峰值约 2GB） | 脚本已自动加 2GB swap；2GB 内存机器建议升到 4GB |
| `docker pull` 超时/失败 | Docker Hub 被墙 | 换 `/etc/docker/daemon.json` 里的 registry-mirrors，或用阿里云专属加速器 |
| 外网打不开，本机 curl 正常 | 安全组没放行 80 | 去云控制台加规则 |
| Live2D 不显示 / 图片裂 | 素材包没传或路径不对 | 确认 `/opt/kirameku/Kirameku/public/live2d` 有文件后 `docker compose restart frontend` |
| `/admin` 空白 | 缺 admin/dist | 重新上传时要带上 `Kirameku-backend/admin/dist` |
| 数据库是空的 | db-init 只在首次生效 | 卷还在就手动导：`docker compose exec -T db psql -U postgres -d kirameku < db-init/01-kirameku.sql` |
| 歌词搜不到 | 音乐服务没起 | `docker compose --profile music up -d` |

## 数据备份

```bash
# 导出
docker compose exec -T db pg_dump -U postgres -d kirameku > backup_$(date +%F).sql

# 恢复
docker compose exec -T db psql -U postgres -d kirameku < backup_2026-10-15.sql
```

上传的图片存在 `backend-uploads` 卷里，也要一起备份：

```bash
docker run --rm -v kirameku_backend-uploads:/data -v $PWD:/backup alpine \
    tar czf /backup/uploads_$(date +%F).tar.gz -C /data .
```

## 待办：上线后建议调整

- [ ] 把 `.env.prod` 里的数据库密码换成更强的，并同步到 PostgreSQL（见上文）
- [ ] 修改 `Kirameku/siteConfig.ts` 里的 `url` 为服务器 IP（影响 sitemap 与 RSS 里的链接）
- [ ] 有域名后：加 HTTPS（推荐用宝塔或 acme.sh 签 Let's Encrypt 证书），并更新同上的 `url`
- [ ] 定期备份数据库与 uploads
