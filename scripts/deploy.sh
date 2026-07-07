#!/usr/bin/env bash
# Run on the Hostinger VPS after SSH: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm ci

echo "==> Building (this may take a few minutes)..."
export NODE_ENV=production
npm run build

echo "==> Restarting app..."
if pm2 describe applymatic >/dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Health check..."
sleep 2
if curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 | grep -qE '200|301|302|307|308'; then
  echo "OK — app responding on port 3000"
else
  echo "WARN — app may not be up yet. Run: pm2 logs applymatic --lines 50"
  exit 1
fi

echo "==> CDN / homepage check (purge Hostinger CDN if apex still shows stale cache)..."
APEX_CACHE="$(curl -sI https://applymatic.ca/ | tr -d '\r' | grep -i '^cache-control:' || true)"
WWW_CACHE="$(curl -sI https://www.applymatic.ca/ | tr -d '\r' | grep -i '^cache-control:' || true)"
echo "applymatic.ca:    ${APEX_CACHE:-no cache-control header}"
echo "www.applymatic.ca: ${WWW_CACHE:-no cache-control header}"
if echo "$APEX_CACHE" | grep -qi 's-maxage=31536000'; then
  echo ""
  echo "WARN — Hostinger CDN is still serving a STALE cached homepage for applymatic.ca."
  echo "       hPanel → CDN → Purge All Cache, and disable HTML caching for /"
  echo "       Until then, https://www.applymatic.ca/ should work."
fi

echo "Deploy finished."
