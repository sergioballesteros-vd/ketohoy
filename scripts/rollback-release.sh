#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEPLOY_PATH:-/home/ubuntu/ketohoy}"
APP_NAME="${PM2_APP_NAME:?PM2_APP_NAME is required}"
CURRENT="$ROOT/current"
PREVIOUS="$ROOT/previous"

test -L "$CURRENT" && test -L "$PREVIOUS" || { echo "Current or previous release is missing" >&2; exit 1; }
current_target="$(readlink "$CURRENT")"
previous_target="$(readlink "$PREVIOUS")"
test -d "$ROOT/$previous_target" || { echo "Previous release directory is missing" >&2; exit 1; }
id="rollback-$(date +%s)-$$"
ln -sfn "$current_target" "$PREVIOUS.next-$id"
node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$PREVIOUS.next-$id" "$PREVIOUS"
ln -sfn "$previous_target" "$CURRENT.next-$id"
node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$CURRENT.next-$id" "$CURRENT"
if ! pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env; then
  ln -sfn "$current_target" "$CURRENT.next-$id"
  node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$CURRENT.next-$id" "$CURRENT"
  pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env || true
  exit 1
fi
if ! curl -fsSI --retry 5 --retry-delay 2 --max-time 15 http://127.0.0.1:3000/login >/dev/null ||
   ! curl -fsS --max-time 15 http://127.0.0.1:3000/api/health | grep -q '"status":"ok"'; then
  ln -sfn "$current_target" "$CURRENT.next-$id"
  node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$CURRENT.next-$id" "$CURRENT"
  ln -sfn "$previous_target" "$PREVIOUS.next-$id"
  node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$PREVIOUS.next-$id" "$PREVIOUS"
  pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env || true
  echo "Rollback healthcheck failed; restored the release active before rollback" >&2
  exit 1
fi
pm2 save
echo "Rolled back to $(basename "$previous_target"); database schema was not rolled back"
