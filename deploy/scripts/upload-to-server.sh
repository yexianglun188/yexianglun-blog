#!/usr/bin/env bash
# ============================================================================
# 上传到云服务器
#
# 用法：
#   bash deploy/scripts/upload-to-server.sh <服务器IP> [用户名]
#
# 例：
#   bash deploy/scripts/upload-to-server.sh 1.2.3.4
#   bash deploy/scripts/upload-to-server.sh 1.2.3.4 ubuntu
#
# 前置条件：已经配好 SSH 密钥登录（ssh user@ip 能免密进），
# 否则每次 scp 都会问密码 —— 交互密码无法在脚本里自动填。
# ============================================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1

IP=${1:?用法: upload-to-server.sh <服务器IP> [用户名]}
USER=${2:-root}
WORK=/e/liu/_deploy
REMOTE_DIR=/opt/kirameku

CODE=$WORK/kirameku-code.tar.gz
ASSETS=$WORK/kirameku-assets.tar.gz

[ -f "$CODE" ] || { echo "找不到 $CODE，先跑 pack-local.sh"; exit 1; }

echo "==> 目标：$USER@$IP:$REMOTE_DIR"
ssh -o StrictHostKeyChecking=no "$USER@$IP" \
    "mkdir -p $REMOTE_DIR && echo SSH 连接正常"

echo "==> 上传代码包（约 40MB）"
scp -o StrictHostKeyChecking=no "$CODE" "$USER@$IP:$REMOTE_DIR/"

if [ -f "$ASSETS" ]; then
    echo "==> 上传素材包（约 230MB，视带宽可能较慢，可 Ctrl+C 中断后单独重传）"
    scp -o StrictHostKeyChecking=no "$ASSETS" "$USER@$IP:$REMOTE_DIR/"
else
    echo "==> 跳过素材包（未生成）"
fi

echo "==> 在服务器上解压"
ssh "$USER@$IP" "cd $REMOTE_DIR && tar -xzf kirameku-code.tar.gz --strip-components=1 && rm -f kirameku-code.tar.gz && if [ -f kirameku-assets.tar.gz ]; then mkdir -p Kirameku/public && tar -xzf kirameku-assets.tar.gz -C Kirameku/public && rm -f kirameku-assets.tar.gz; fi && ls -la $REMOTE_DIR"

echo
echo "上传完成。接下来在服务器上执行："
echo "  cd $REMOTE_DIR/deploy && bash scripts/server-first-deploy.sh"
