#!/bin/sh
set -eu

node /app/server/auth-server.mjs &
API_PID=$!
NGINX_PID=""
WATCH_PID=""

cleanup() {
  if [ -n "${NGINX_PID}" ]; then
    kill -TERM "${NGINX_PID}" 2>/dev/null || true
  fi
  if [ -n "${WATCH_PID}" ]; then
    kill -TERM "${WATCH_PID}" 2>/dev/null || true
  fi
  kill -TERM "${API_PID}" 2>/dev/null || true
  wait "${WATCH_PID}" 2>/dev/null || true
  wait "${API_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

nginx -g 'daemon off;' &
NGINX_PID=$!

(
  wait "${API_PID}" || true
  kill -TERM "${NGINX_PID}" 2>/dev/null || true
) &
WATCH_PID=$!

wait "${NGINX_PID}"
NGINX_STATUS=$?

cleanup
exit "${NGINX_STATUS}"
