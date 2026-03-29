# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/web/package.json ./packages/web/
COPY packages/desktop/package.json ./packages/desktop/
COPY packages/vscode/package.json ./packages/vscode/

RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS builder
WORKDIR /app

COPY . .

# 构建 web
RUN bun run build:web

# 如果你后面有真正的 bun compile/native build，可在这里加：
# RUN bun build ./packages/web/server/index.ts --compile --outfile /out/openchamber

# 导出阶段：把需要的构建结果直接输出给宿主机
FROM debian:bookworm-slim AS export
WORKDIR /out

# web 构建产物
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/web/server ./packages/web/server
COPY --from=builder /app/packages/web/bin ./packages/web/bin
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/package.json ./package.json

# 如果你还想把依赖一并导出
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules

# 如果你需要 cloudflared 二进制，也一起导出
COPY --from=cloudflare/cloudflared:latest /usr/local/bin/cloudflared ./bin/cloudflared