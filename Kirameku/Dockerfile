# 前端镜像（Next.js 16 生产模式）
#
# 构建上下文必须是仓库里的 Kirameku 目录（含 public 素材）。
# public/live2d、images、audio 已在 .dockerignore 中排除 —— 它们体积大且不属于代码，
# 部署时由 docker-compose 以只读卷挂载，更新素材无需重建镜像。
#
# 构建期峰值内存约 1.5~2GB。2GB 内存的机器请先在服务器加 2GB swap，否则 build 会被 OOM kill。

FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm config set registry https://registry.npmmirror.com
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile


FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build


FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# public 中的素材目录由卷覆盖挂载，这里只保证骨架存在
COPY --from=builder /app/public ./public
RUN mkdir -p /app/public/live2d /app/public/images /app/public/audio

EXPOSE 3000

CMD ["pnpm", "start"]
