# 号源 QueueDepth · 患者端 / 分诊台 H5 镜像（S14）
#
# 两阶段：Node 构建 H5 静态产物（dist/build/h5）→ nginx 托管。
# 接口前缀在**构建期**固定为 /dev-api（与开发态代理语义一致，可用 build-arg 覆盖）；
# 后端地址在**运行期**由 APPT_API_UPSTREAM 注入 nginx 模板，同一个镜像可指向任意后端。
#
# 只构建 H5：小程序包需要真实 AppID 与微信开发者工具，不在镜像范围内。
#
# 构建：docker build -t ghcr.io/xcqj/appt-h5:v0.1.0 .
# 运行：docker run --rm -p 8084:80 -e APPT_API_UPSTREAM=http://<host>:8082 ghcr.io/xcqj/appt-h5:v0.1.0

FROM node:22-alpine AS build
WORKDIR /app

# 版本取自 package.json 的 packageManager 字段（pnpm 12 需要 workspace 的 allowBuilds）
RUN npm install -g pnpm@12.4.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_APP_BASE_API=/dev-api
ENV VITE_APP_BASE_API=${VITE_APP_BASE_API} \
    CI=true \
    NODE_OPTIONS=--max-old-space-size=4096

RUN pnpm build:h5

FROM nginx:1.31-alpine

ENV APPT_API_UPSTREAM=http://api:8082 \
    NGINX_ENVSUBST_FILTER=^APPT_

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/build/h5 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=12 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
