#!/usr/bin/env bash
# ============================================================================
# 服务器首次部署（Ubuntu 22.04 / 24.04）
#
# 用法：
#   cd /opt/kirameku/deploy
#   bash scripts/server-first-deploy.sh
#
# 会依次做：安装 Docker → 配置镜像加速 → 按需开 swap → 建外部/目录 →
#           复制音乐服务 Dockerfile → 生成 .env.prod → 构建并启动 → 健康检查
#
# 可以安全地重复执行：已经存在的步骤会自动跳过。
# ============================================================================
set -euo pipefail

BASE=/opt/kirameku
DEPLOY=$BASE/deploy

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[info]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()  { echo -e "${RED}[fail]${NC}  $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "请用 root 执行：sudo bash $0"

command -v lsb_release >/dev/null && UBUNTU=$(lsb_release -rs) || UBUNTU="unknown"
info "系统 Ubuntu $UBUNTU"

# ---------------------------------------------------------------- 1. Docker
if command -v docker >/dev/null 2>&1; then
    info "Docker 已安装：$(docker --version)"
else
    warn "未检测到 Docker，开始安装（Ubuntu 官方源，国内下载快）"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    apt-get install -y docker.io
    systemctl enable --now docker
    info "Docker 安装完成"
fi

if docker compose version >/dev/null 2>&1; then
    info "Compose 已就绪：$(docker compose version --short)"
else
    warn "安装 Compose 插件"
    apt-get install -y docker-compose-v2 \
        || apt-get install -y docker-compose-plugin \
        || fail "Compose 插件安装失败，请手动安装后重试"
    info "Compose 安装完成"
fi

# ------------------------------------------------------- 2. 镜像加速（国内必配）
DAEMON=/etc/docker/daemon.json
if [ -f "$DAEMON" ] && grep -q "registry-mirrors" "$DAEMON"; then
    info "镜像加速器已配置"
else
    warn "配置 Docker Hub 镜像加速 + 日志滚动"
    mkdir -p /etc/docker
    cat > "$DAEMON" <<'JSON'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.imgdb.de",
    "https://hub.rat.dev"
  ],
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" },
  "live-restore": true
}
JSON
    systemctl restart docker
    sleep 3
    info "已重启 Docker"
fi

info "测试拉取基础镜像（失败说明加速器不可用，需换 mirrors 后重试）"
if ! timeout 300 docker pull postgres:16-alpine >/dev/null 2>&1; then
    warn "postgres:16-alpine 拉取失败。常见解法："
    warn "  1) 换一组 registry-mirrors 后 systemctl restart docker"
    warn "  2) 用阿里云容器镜像服务 → 镜像加速器，换成你专属的 https://xxx.mirror.aliyuncs.com"
    fail "无法拉取基础镜像，已中止"
fi
info "镜像拉取正常"

# ---------------------------------------------------------------- 3. Swap
TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MB" -lt 3000 ] && [ ! -f /swapfile ]; then
    warn "内存 ${TOTAL_MB}MB 偏小（Next.js 构建峰值约 2GB），创建 2GB swap"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    info "swap 已启用"
else
    info "内存 ${TOTAL_MB}MB，无需额外 swap"
fi

# ---------------------------------------------------------------- 4. 目录检查
for d in Kirameku Kirameku-backend deploy db-init; do
    [ -d "$BASE/$d" ] || fail "缺少目录 $BASE/$d —— 上传包是否解压正确？"
done
[ -f "$BASE/db-init/01-kirameku.sql" ] || warn "没有数据库备份，服务器会得到一个空库"
[ -d "$BASE/Kirameku-backend/admin/dist" ] || warn "缺少管理后台 dist，/admin 将不可访问"
info "目录结构检查通过"

# ------------------------------------------------- 5. 音乐服务 Dockerfile
if [ -d "$BASE/ncm-api" ]; then
    cp "$DEPLOY/music.Dockerfile" "$BASE/ncm-api/Dockerfile.kirameku"
    info "已复制音乐服务 Dockerfile"
else
    warn "未找到 ncm-api，跳过音乐服务（站点其它功能不受影响）"
fi

# ---------------------------------------------------------------- 6. 环境变量
if [ -f "$DEPLOY/.env.prod" ]; then
    info ".env.prod 已存在，沿用现有配置"
else
    warn "由模板生成 .env.prod"
    cp "$DEPLOY/.env.prod.example" "$DEPLOY/.env.prod"
    chmod 600 "$DEPLOY/.env.prod"
    # 生成随机密钥
    if command -v openssl >/dev/null; then
        PW=$(openssl rand -base64 18 | tr -d '/+=')
        SK=$(openssl rand -base64 48 | tr -d '/+=')
        sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PW|" "$DEPLOY/.env.prod"
        sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$SK|" "$DEPLOY/.env.prod"
    fi
    info "已生成随机数据库密码与 JWT 密钥"
fi

# ---------------------------------------------------------------- 7. 构建启动
info "开始构建镜像（首次较慢，约 5~15 分钟）"
cd "$DEPLOY"
# shellcheck disable=SC1091
set -a; . ./.env.prod; set +a

docker compose build backend frontend nginx 2>&1 | tail -40
docker compose up -d

echo
info "等待服务就绪（最多 90 秒）"
for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1; then
        break
    fi
    sleep 3
done

echo
info "==================== 服务状态 ===================="
docker compose ps

echo
if curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1; then
    info "Nginx 正常"
    curl -fsS -o /dev/null -w "首页 HTTP %{http_code}（耗时 %{time_total}s）\n" http://127.0.0.1/
else
    warn "Nginx 未就绪，查看日志：cd $DEPLOY && docker compose logs -f"
fi

echo
info "==================== 后续可选 ===================="
echo "  启动音乐服务：cd $DEPLOY && docker compose --profile music up -d --build"
echo "  查看后端日志：cd $DEPLOY && docker compose logs -f backend"
echo "  重启全部服务：cd $DEPLOY && docker compose restart"
echo
warn "别忘了在云厂商控制台的安全组里放行 80 端口，否则外网访问不了"
