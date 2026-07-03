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

echo "Deploy finished."
