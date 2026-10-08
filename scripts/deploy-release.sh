#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "${1:?source checkout required}" && pwd)"
ROOT="${DEPLOY_PATH:-/home/ubuntu/ketohoy}"
RELEASE_ID="${DEPLOY_SHA:?DEPLOY_SHA is required}-${DEPLOY_RUN_ID:?DEPLOY_RUN_ID is required}"
APP_NAME="${PM2_APP_NAME:?PM2_APP_NAME is required}"
mkdir -p "$ROOT"
ROOT="$(cd "$ROOT" && pwd -P)"
DB_PATH="$ROOT/dev.db"
RELEASES="$ROOT/releases"
CURRENT="$ROOT/current"
PREVIOUS="$ROOT/previous"

[[ "$RELEASE_ID" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo "Invalid release identity" >&2; exit 1; }
test -n "${RESEND_API_KEY:-}" || { echo "Required deployment configuration is missing" >&2; exit 1; }
mkdir -p "$RELEASES" "$ROOT/shared" "$ROOT/shared/privacy" "$ROOT/backups"
chmod 700 "$ROOT/shared/privacy"
touch "$ROOT/shared/privacy/account-deletions.jsonl"
chmod 600 "$ROOT/shared/privacy/account-deletions.jsonl"
export DATABASE_URL="file:$DB_PATH"
umask 077
cp "$SOURCE_DIR/scripts/backup-db.py" "$ROOT/shared/backup-db.next"
chmod 700 "$ROOT/shared/backup-db.next"
mv -f "$ROOT/shared/backup-db.next" "$ROOT/shared/backup-db.py"
printf 'DATABASE_URL=file:%s\nACCOUNT_DELETION_LEDGER=%s/shared/privacy/account-deletions.jsonl\nCOOKIE_SECURE=true\nAPP_URL=https://%s\nUNSPLASH_ACCESS_KEY=%s\nRESEND_API_KEY=%s\nGOOGLE_CLIENT_ID=%s\nGOOGLE_CLIENT_SECRET=%s\n' \
  "$DB_PATH" "$ROOT" "${APP_DOMAIN:?APP_DOMAIN is required}" "${UNSPLASH_ACCESS_KEY:-}" "$RESEND_API_KEY" \
  "${GOOGLE_CLIENT_ID:-}" "${GOOGLE_CLIENT_SECRET:-}" > "$ROOT/shared/.env.local"
unset UNSPLASH_ACCESS_KEY RESEND_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
cp "$SOURCE_DIR/scripts/rollback-release.sh" "$ROOT/shared/rollback-release.next"
chmod 700 "$ROOT/shared/rollback-release.next"
node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$ROOT/shared/rollback-release.next" "$ROOT/shared/rollback-release.sh"

atomic_link() {
  local target="$1" link="$2" tmp="${2}.next-${RELEASE_ID}"
  ln -sfn "$target" "$tmp"
  node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' "$tmp" "$link"
}

if [ ! -L "$CURRENT" ]; then
  old_sha="$(cat "$ROOT/.deploy-sha" 2>/dev/null || printf legacy)"
  old_sha="${old_sha:0:40}"
  legacy_id="${old_sha:-legacy}-legacy"
  legacy="$RELEASES/$legacy_id"
  if [ ! -d "$legacy" ]; then
    mkdir -p "$legacy"
    rsync -a --delete \
      --exclude '.git/' --exclude '.env' --exclude '.env.*' --exclude 'dev.db*' \
      --exclude 'backups/' --exclude 'releases/' --exclude 'shared/' --exclude 'current' --exclude 'previous' \
      "$ROOT"/ "$legacy"/
    ln -s "$ROOT/shared/.env.local" "$legacy/.env.local"
    printf '%s\n' "$old_sha" > "$legacy/.deploy-sha"
  fi
  atomic_link "releases/$legacy_id" "$CURRENT"
fi

OLD_TARGET="$(readlink "$CURRENT")"
RELEASE="$RELEASES/$RELEASE_ID"
test ! -e "$RELEASE" || { echo "Release already exists; refusing to mutate it" >&2; exit 1; }
mkdir "$RELEASE"
rsync -a --delete \
  --exclude '.git/' --exclude '.env' --exclude '.env.*' --exclude 'dev.db*' --exclude 'backups/' \
  --exclude 'node_modules/' --exclude '.next/' \
  "$SOURCE_DIR"/ "$RELEASE"/
printf '%s\n' "$DEPLOY_SHA" > "$RELEASE/.deploy-sha"
test "$(cat "$RELEASE/.deploy-sha")" = "$DEPLOY_SHA"

cd "$RELEASE"
npm ci --include=dev --no-audit --no-fund
ln -s "$ROOT/shared/.env.local" "$RELEASE/.env.local"
npm run build

# Requires sqlite3 on the deploy host. The backup is retained before any DDL.
if [ -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" ".backup '$ROOT/backups/pre-migration-$RELEASE_ID.db'"
fi

node scripts/baseline-legacy.mjs
migration_log="$(mktemp)"
if ! npx prisma migrate deploy > "$migration_log" 2>&1; then
  sed -E 's#file:[^[:space:]]+#file:<shared SQLite>#g' "$migration_log" >&2
  rm -f "$migration_log"
  echo "migration deploy failed" >&2
  exit 1
fi
rm -f "$migration_log"

PORT=3101 npm start -- --hostname 127.0.0.1 > "$RELEASE/pre-health.log" 2>&1 &
candidate_pid=$!
stop_candidate() { kill "$candidate_pid" 2>/dev/null || true; wait "$candidate_pid" 2>/dev/null || true; rm -f "$RELEASE/pre-health.log"; }
trap stop_candidate EXIT
curl -fsSI --retry 5 --retry-delay 2 --max-time 15 http://127.0.0.1:3101/login | head -1 | grep -q ' 200'
curl -fsS --max-time 15 http://127.0.0.1:3101/api/health | grep -q '"status":"ok"'
stop_candidate
trap - EXIT

cat > "$ROOT/ecosystem.config.cjs" <<'EOF'
module.exports = { apps: [{ name: process.env.PM2_APP_NAME, cwd: __dirname + '/current', script: 'node_modules/next/dist/bin/next', args: 'start -H 127.0.0.1', env: { NODE_ENV: 'production', PORT: '3000' }, exec_mode: 'fork', instances: 1 }] }
EOF
atomic_link "$OLD_TARGET" "$PREVIOUS"
atomic_link "releases/$RELEASE_ID" "$CURRENT"
if ! pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env; then
  atomic_link "$OLD_TARGET" "$CURRENT"
  if pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env; then
    curl -fsSI --retry 5 --retry-delay 2 --max-time 15 http://127.0.0.1:3000/login >/dev/null || true
    curl -fsS --max-time 15 http://127.0.0.1:3000/api/health | grep -q '"status":"ok"' || true
  fi
  exit 1
fi
if ! curl -fsSI --retry 5 --retry-delay 2 --max-time 15 http://127.0.0.1:3000/login | head -1 | grep -q ' 200' ||
   ! curl -fsS --max-time 15 http://127.0.0.1:3000/api/health | grep -q '"status":"ok"'; then
  echo "Post-activation healthcheck failed; restoring previous release" >&2
  atomic_link "$OLD_TARGET" "$CURRENT"
  pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env || true
  exit 1
fi
if ! curl -fsSI --retry 5 --retry-delay 3 --max-time 20 "https://${APP_DOMAIN}/login" > /tmp/ketohoy-login.headers ||
   ! grep -q ' 200' /tmp/ketohoy-login.headers ||
   ! grep -qi '^content-security-policy:' /tmp/ketohoy-login.headers ||
   ! grep -qi '^strict-transport-security:' /tmp/ketohoy-login.headers; then
  echo "Public healthcheck failed; restoring previous release" >&2
  atomic_link "$OLD_TARGET" "$CURRENT"
  pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env || true
  exit 1
fi
pm2 save
printf '%s\n' "$DEPLOY_SHA" > "$ROOT/.deploy-sha"
echo "Activated release $RELEASE_ID"

if [ -e "$ROOT/backups/pre-migration-$RELEASE_ID.db" ]; then
  ls -1t "$ROOT"/backups/pre-migration-*.db | tail -n +11 | xargs -r rm --
fi

current_real="$(readlink -f "$CURRENT")"
previous_real="$(readlink -f "$PREVIOUS")"
index=0
while IFS= read -r release_dir; do
  if [ "$index" -ge 5 ] && [ "$release_dir" != "$current_real" ] && [ "$release_dir" != "$previous_real" ]; then
    rm -rf -- "$release_dir"
  fi
  index=$((index + 1))
done < <(ls -1td "$RELEASES"/*)
