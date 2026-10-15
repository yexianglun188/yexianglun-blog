# 音乐服务镜像 —— NeteaseCloudMusicApi Enhanced（酷我搜索 + 解灰取流）
#
# 这个文件本身放在 deploy/ 下，部署脚本会把它复制为 ncm-api/Dockerfile.kirameku
# 再构建，因为 Docker 要求 Dockerfile 位于构建上下文内部。
#
# 相比上游官方 Dockerfile 的差异：
#   1. 显式 COPY kuwo-patch.js / unblock-patch.js —— 这两个补丁是本项目自定义的，
#      server.js 会在运行时 require 它们；而上游 .dockerignore 的白名单里没有这两个文件。
#   2. 预置端口与解灰开关（可被 docker-compose 的 environment 覆盖）。
#   3. npm 源指向 npmmirror，国内服务器安装更快。

FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3301 \
    # 必须开启：否则 VIP 歌曲（周杰伦等）拿不到可播地址
    ENABLE_GENERAL_UNBLOCK=true \
    # 必须关闭：桌面版 Chromium 不解 FLAC，拿到 x-flac 会导致播放失败并自动跳歌
    ENABLE_FLAC=false

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm config set registry https://registry.npmmirror.com

WORKDIR /app

# 上游 .dockerignore 采用「先排除全部再白名单」的策略，这里显式列出所需文件，
# 免得把本地 node_modules / .git 之类的东西也带进来。
# 注意：这里列出的每一项都必须在仓库里真实存在，缺一个 COPY 就会直接构建失败，
# 而且报错只是简单的一句 "/xxx": not found。当前版本没有 static 目录。
COPY module ./module
COPY plugins ./plugins
COPY public ./public
COPY util ./util
COPY data ./data
COPY app.js index.js generateConfig.js main.js server.js package.json pnpm-lock.yaml ./
# 本项目自定义的两个补丁：server.js 运行时 require 它们。
# 光在这里 COPY 没用 —— 上游 .dockerignore 的白名单里没有这两个文件，
# 会在构建上下文阶段就被剔除，必须先把它俩加进 ncm-api/.dockerignore 的白名单
# （部署脚本负责追加，手动部署勿忘）。
COPY kuwo-patch.js unblock-patch.js ./

# husky 是 devDependency，--prod 下 prepare 脚本会失败，故跳过生命周期脚本
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

EXPOSE 3301

CMD ["/usr/bin/tini", "--", "node", "app.js"]
