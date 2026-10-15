#!/usr/bin/env bash
# ============================================================================
# 本机（Windows Git Bash）一键同步到云服务器
#
#   bash deploy/scripts/sync-to-server.sh                 # 同步代码，自动按需重建
#   bash deploy/scripts/sync-to-server.sh --assets        # 连同 public 素材一起同步
#   bash deploy/scripts/sync-to-server.sh --assets-only   # 只同步素材（不碰代码）
#   bash deploy/scripts/sync-to-server.sh --force         # 不比较，强制重建全部
#   bash deploy/scripts/sync-to-server.sh --no-build      # 只传文件，不重建镜像
#
# 工作原理：
#   先在本地和服务器上各算一份「源码指纹」（所有文件的路径 + 内容 md5），
#   只有指纹变了才上传该部分、才重建对应容器。
#   指纹基于**内容**而非修改时间，所以重新 clone、git pull 导致的 mtime 变化
#   不会触发无谓的 2 分钟构建。
#
#   注意 sort 必须带 LC_ALL=C：本机（Windows）与服务器（Linux）的 locale 不同，
#   对 [slug]、大小写、点文件的排序结果不一致。文件清单明明一模一样，
#   排列顺序不同会让 md5 序列不同 → 指纹对不上 → 每次都误判成"有变化"。
#
# 前置：本机已能免密 SSH 到服务器（见 deploy/README.md）
# ============================================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1

# ---------------- 配置（换服务器时改这里）----------------
REMOTE_HOST="${KIRAMEKU_HOST:-122.51.90.31}"
REMOTE_USER="${KIRAMEKU_USER:-ubuntu}"
SSH_KEY="${KIRAMEKU_KEY:-$HOME/.ssh/kirameku_server}"
REMOTE_BASE=/opt/kirameku
REPO_LOCAL=/e/liu/Kirameku
WORK=/e/liu/_deploy/sync

ASSETS=0; ASSETS_ONLY=0; FORCE=0; NO_BUILD=0
for arg in "$@"; do
    case "$arg" in
        --assets)      ASSETS=1 ;;
        --assets-only) ASSETS_ONLY=1; ASSETS=1 ;;
        --force)       FORCE=1 ;;
        --no-build)    NO_BUILD=1 ;;
        -h|--help)     sed -n '2,20p' "$0"; exit 0 ;;
        *) echo "未知参数: $arg（用 --help 看用法）"; exit 1 ;;
    esac
done

SSHO="-i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SSH="ssh $SSHO $REMOTE_USER@$REMOTE_HOST"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { printf "${GREEN}[同步]${NC} %s\n" "$*"; }
step() { printf "${BLUE}[....]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[注意]${NC} %s\n" "$*"; }

# ------------------------------------------------------------ 指纹
# 相对路径 + 内容一起算，保证「内容没变就不重建」
fingerprint() {
    local dir="$1" remote="$2"
    local fp
    if [ "$remote" = "1" ]; then
        fp=$($SSH "cd $REMOTE_BASE/$dir 2>/dev/null && find . -type f \
            -not -path '*/node_modules/*' -not -path '*/.next/*' \
            -not -path '*/public/live2d/*' -not -path '*/public/images/*' \
            -not -path '*/public/audio/*' -not -name '*.tsbuildinfo' \
            -not -path './.git/*' -not -path './venv/*' -not -path '*__pycache__*' \
            -not -name '.env' -not -name '.env.prod' -not -path './certbot-webroot/*' \
            -print0 2>/dev/null | LC_ALL=C sort -z | xargs -0 md5sum -b 2>/dev/null | md5sum | cut -d' ' -f1" 2>/dev/null)
    else
        fp=$(cd "$REPO_LOCAL/$dir" && find . -type f \
            -not -path '*/node_modules/*' -not -path '*/.next/*' \
            -not -path '*/public/live2d/*' -not -path '*/public/images/*' \
            -not -path '*/public/audio/*' -not -name '*.tsbuildinfo' \
            -not -path './.git/*' -not -path './venv/*' -not -path '*__pycache__*' \
            -not -name '.env' -not -name '.env.prod' -not -path './certbot-webroot/*' \
            -print0 | LC_ALL=C sort -z | xargs -0 md5sum -b | md5sum | cut -d' ' -f1)
    fi
    echo "${fp:-none}"
}

# ---------------- 0. 检查 ----------------
[ -f "$SSH_KEY" ] || { echo "找不到 SSH 私钥 $SSH_KEY"; exit 1; }
step "检查服务器连通性…"
$SSH "echo ok" >/dev/null 2>&1 || { echo "连不上 $REMOTE_USER@$REMOTE_HOST"; exit 1; }

# ---------------- 1. 素材（优先级最高，不用判断直接传）----------------
if [ "$ASSETS" = "1" ]; then
    info "同步 public 素材（不入仓库，必须单独传）"
    rm -rf "$WORK"; mkdir -p "$WORK"
    tar -C "$REPO_LOCAL/Kirameku/public" -czf "$WORK/assets.tar.gz" live2d images audio
    scp $SSHO "$WORK/assets.tar.gz" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_BASE/assets.tar.gz" >/dev/null 2>&1
    $SSH "cd $REMOTE_BASE && mkdir -p Kirameku/public && tar -xzf assets.tar.gz -C Kirameku/public && rm -f assets.tar.gz && echo '  素材就位（卷挂载实时生效，无需重建）'"
fi

if [ "$ASSETS_ONLY" = "1" ]; then
    info "只同步素材，跳过代码"
    $SSH "cd $REMOTE_BASE/deploy && curl -s -o /dev/null -w '  站点检查: %{http_code}\n' https://127.0.0.1/ -k"
    rm -rf "$WORK"; exit 0
fi

# ---------------- 2. 代码：比对指纹 ----------------
info "比对本地与服务器的源码指纹…"
declare -A FP_LOCAL FP_REMOTE
for part in Kirameku Kirameku-backend deploy; do
    FP_LOCAL[$part]=$(fingerprint "$part" 0)
    FP_REMOTE[$part]=$(fingerprint "$part" 1)
done

NEED_FE=0; NEED_BE=0; NEED_DEPLOY=0
[ "$FORCE" = "1" ] && { NEED_FE=1; NEED_BE=1; NEED_DEPLOY=1; }
[ "${FP_LOCAL[Kirameku]}" != "${FP_REMOTE[Kirameku]}" ] && NEED_FE=1
[ "${FP_LOCAL[Kirameku-backend]}" != "${FP_REMOTE[Kirameku-backend]}" ] && NEED_BE=1
[ "${FP_LOCAL[deploy]}" != "${FP_REMOTE[deploy]}" ] && NEED_DEPLOY=1

printf "  前端 Kirameku          %s\n" "$([ $NEED_FE = 1 ] && echo '有变化 → 将重建' || echo '无变化')"
printf "  后端 Kirameku-backend  %s\n" "$([ $NEED_BE = 1 ] && echo '有变化 → 将重建' || echo '无变化')"
printf "  配置 deploy/          %s\n" "$([ $NEED_DEPLOY = 1 ] && echo '有变化 → 将重载' || echo '无变化')"

if [ "$NEED_FE" = 0 ] && [ "$NEED_BE" = 0 ] && [ "$NEED_DEPLOY" = 0 ] && [ "$ASSETS" = 0 ]; then
    info "代码与服务器一致，无需操作。"
    rm -rf "$WORK"; exit 0
fi

# ---------------- 3. 打包上传 ----------------
rm -rf "$WORK"; mkdir -p "$WORK"
if [ "$NEED_FE" = 1 ]; then
    step "打包前端源码…"
    tar -C "$REPO_LOCAL" -czf "$WORK/fe.tar.gz" \
        --exclude='node_modules' --exclude='.next' --exclude='.git' \
        --exclude='public/live2d' --exclude='public/images' --exclude='public/audio' \
        --exclude='*.tsbuildinfo' \
        Kirameku
fi
if [ "$NEED_BE" = 1 ]; then
    step "打包后端源码（含管理后台 dist）…"
    tar -C "$REPO_LOCAL" -czf "$WORK/be.tar.gz" \
        --exclude='venv' --exclude='__pycache__' --exclude='.git' --exclude='.env' \
        Kirameku-backend
fi
if [ "$NEED_DEPLOY" = 1 ]; then
    step "打包部署配置…"
    tar -C "$REPO_LOCAL" -czf "$WORK/deploy.tar.gz" \
        --exclude='certbot-webroot' --exclude='.env.prod' deploy
fi

step "上传到服务器…"
for f in fe be deploy; do
    [ -f "$WORK/$f.tar.gz" ] || continue
    scp $SSHO "$WORK/$f.tar.gz" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_BASE/$f.tar.gz" >/dev/null 2>&1
done

$SSH "cd $REMOTE_BASE
for f in fe be deploy; do
    [ -f \$f.tar.gz ] || continue
    tar -xzf \$f.tar.gz
    rm -f \$f.tar.gz
done
echo '  文件已更新'"

# ---------------- 4. 重建 ----------------
if [ "$NO_BUILD" = 1 ]; then
    warn "已按 --no-build 跳过镜像重建"
else
    BUILDS=""
    [ "$NEED_FE" = 1 ] && BUILDS="$BUILDS frontend"
    [ "$NEED_BE" = 1 ] && BUILDS="$BUILDS backend"
    if [ -n "$BUILDS" ]; then
        info "重建镜像：$BUILDS（约 1~3 分钟）"
        # shellcheck disable=SC2086
        $SSH "cd $REMOTE_BASE/deploy && set -a && . ./.env.prod && set +a && docker compose build $BUILDS 2>&1 | tail -3"
    fi
fi

# ---------------- 5. 重启 + 验证 ----------------
info "应用变更并验证"
$SSH "cd $REMOTE_BASE/deploy && set -a && . ./.env.prod && set +a
docker compose up -d 2>&1 | grep -E 'Started|Recreated' | tail -4
sleep 12
echo '--- 验收 ---'
for u in / /api/health /admin; do
    printf '  %-14s ' \"\$u\"
    curl -s -o /dev/null -w '%{http_code}\n' \"https://127.0.0.1\$u\" -k
done
docker compose ps --format 'table {{.Name}}\t{{.Status}}' | tail -6"

rm -rf "$WORK"
info "完成 ✓"
