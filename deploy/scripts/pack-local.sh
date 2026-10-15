#!/usr/bin/env bash
# ============================================================================
# 本机（Windows Git Bash）打包脚本
#
# 作用：把部署到服务器所需的一切打成两个压缩包
#   1. kirameku-code.tar.gz    代码 + 音乐服务 + 数据库备份（约 40MB，上传很快）
#   2. kirameku-assets.tar.gz  public 下的三个素材目录（约 230MB，可后传）
#
# 为什么要拆开：素材（尤其 Live2D 的 217MB）上传很慢。先传代码把站点跑起来，
# 再慢慢传素材，中途断网也不会影响已经部署好的部分。
#
# 用法：
#   bash deploy/scripts/pack-local.sh
# ============================================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1

REPO=/e/liu/Kirameku
NCM=/e/liu/ncm-api
WORK=/e/liu/_deploy
STAGE=$WORK/stage

rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "==> [1/4] 后端 + 前端 + deploy 目录"
tar -C "$REPO" -cf - \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='venv' \
    --exclude='.git' \
    --exclude='*.tsbuildinfo' \
    --exclude='public/live2d' \
    --exclude='public/images' \
    --exclude='public/audio' \
    Kirameku Kirameku-backend deploy \
    | tar -C "$STAGE" -xf -

echo "==> [2/4] 音乐服务（含我们自己的两个补丁文件）"
tar -C "$(dirname "$NCM")" -cf - \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    ncm-api \
    | tar -C "$STAGE" -xf -

echo "==> [3/4] 数据库备份"
mkdir -p "$STAGE/db-init"
if [ -f "$WORK/kirameku_full.sql" ]; then
    cp "$WORK/kirameku_full.sql" "$STAGE/db-init/01-kirameku.sql"
    echo "    已附带 $(du -h "$WORK/kirameku_full.sql" | cut -f1) 的完整备份"
else
    echo "    !! 找不到 $WORK/kirameku_full.sql"
    echo "       先执行导库命令，否则服务器会是空库。"
fi

echo "==> [4/4] 打包"
rm -f "$WORK"/kirameku-code.tar.gz "$WORK"/kirameku-assets.tar.gz

# 代码包：stage 里去掉空的素材占位
tar -C "$WORK" -czf "$WORK/kirameku-code.tar.gz" stage

# 素材包：直接从原目录打，解压后覆盖到 Kirameku/public 下
tar -C "$REPO/Kirameku/public" -czf "$WORK/kirameku-assets.tar.gz" live2d images audio

echo
echo "完成："
ls -lh "$WORK"/kirameku-code.tar.gz "$WORK"/kirameku-assets.tar.gz
echo
echo "下一步：bash deploy/scripts/upload-to-server.sh <服务器IP> [用户名]"
