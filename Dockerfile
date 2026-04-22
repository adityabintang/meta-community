FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy manifest and lockfiles first to maximize layer cache reuse.
COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bun run build

FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache nginx

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/start.sh /start.sh

RUN chmod +x /start.sh && mkdir -p /run/nginx

ENV NODE_ENV=production

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["/start.sh"]
