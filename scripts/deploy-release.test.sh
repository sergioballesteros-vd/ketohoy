#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
RSYNC_BIN="$(command -v rsync)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"
mkdir -p "$TMP/source/prisma/migrations/20260629183529_init" "$TMP/source/scripts"
cp "$ROOT_DIR/scripts/rollback-release.sh" "$TMP/source/scripts/rollback-release.sh"
cp "$ROOT_DIR/scripts/backup-db.py" "$TMP/source/scripts/backup-db.py"
printf '{"scripts":{"build":"true"}}\n' > "$TMP/source/package.json"
printf 'fixture\n' > "$TMP/source/prisma/migrations/20260629183529_init/migration.sql"
printf "console.log('legacy baseline matched fixture')\n" > "$TMP/source/scripts/baseline-legacy.mjs"

cat > "$TMP/bin/npm" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == ci && "${FAIL_INSTALL:-}" == 1 ]]; then exit 1; fi
if [[ "$1 ${2:-}" == "run build" && "${FAIL_BUILD:-}" == 1 ]]; then exit 1; fi
if [[ "$1 ${2:-}" == "start "* ]]; then exec tail -f /dev/null; fi
exit 0
EOF
cat > "$TMP/bin/rsync" <<EOF
#!/usr/bin/env bash
[[ "\${FAIL_SYNC:-}" != 1 ]] || exit 1
exec "$RSYNC_BIN" "\$@"
EOF
cat > "$TMP/bin/npx" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == "prisma db seed" ]]; then touch "$SEED_MARKER"; exit 1; fi
if [[ "$*" == "prisma migrate deploy" && "${FAIL_MIGRATION:-}" == 1 ]]; then exit 1; fi
exit 0
EOF
cat > "$TMP/bin/sqlite3" <<'EOF'
#!/usr/bin/env bash
if [[ "${2:-}" == .backup* ]]; then
  destination="$(printf '%s\n' "$2" | sed -E "s/^\\.backup '(.+)'$/\\1/")"
  cp "$1" "$destination"
else
  echo 0
fi
EOF
cat > "$TMP/bin/curl" <<'EOF'
#!/usr/bin/env bash
url="${*: -1}"
if [[ "$url" == *:3101/api/health ]]; then
  [[ "${FAIL_PRE_HEALTH:-}" != 1 ]] || exit 22
  echo '{"status":"ok"}'
elif [[ "$url" == *:3000/api/health ]]; then
  [[ "${FAIL_POST_HEALTH:-}" != 1 ]] || exit 22
  echo '{"status":"ok"}'
elif [[ "$url" == *:3000/login ]]; then
  [[ "${FAIL_POST_HEALTH:-}" != 1 ]] || { printf 'HTTP/1.1 503 unavailable\n'; exit 0; }
  printf 'HTTP/1.1 200 OK\n'
elif [[ "$url" == *:3101/login ]]; then
  printf 'HTTP/1.1 200 OK\n'
elif [[ "$url" == https://*/login ]]; then
  printf 'HTTP/2 200\ncontent-security-policy: test\nstrict-transport-security: test\n'
else
  echo 200
fi
EOF
cat > "$TMP/bin/pm2" <<'EOF'
#!/usr/bin/env bash
[[ "${FAIL_PM2:-}" != 1 ]]
EOF
chmod +x "$TMP/bin/"*

new_root() {
  local name="$1"
  DEPLOY_ROOT="$TMP/$name"
  mkdir -p "$DEPLOY_ROOT/releases/old" "$DEPLOY_ROOT/backups"
  printf 'old release\n' > "$DEPLOY_ROOT/releases/old/.deploy-sha"
  ln -s releases/old "$DEPLOY_ROOT/current"
  printf 'persistent sqlite fixture\n' > "$DEPLOY_ROOT/dev.db"
  printf 'old\n' > "$DEPLOY_ROOT/.deploy-sha"
}

expect_failure_preserves_current() {
  local name="$1" failure_var="$2" current_before db_before
  new_root "$name"
  current_before="$(readlink "$DEPLOY_ROOT/current")"
  db_before="$(cat "$DEPLOY_ROOT/dev.db")"
  if env "$failure_var=1" PATH="$TMP/bin:$PATH" DEPLOY_PATH="$DEPLOY_ROOT" DEPLOY_SHA=0123456789abcdef0123456789abcdef01234567 \
    DEPLOY_RUN_ID=100-1 PM2_APP_NAME=ketohoy APP_DOMAIN=example.test RESEND_API_KEY=test \
    BACKUP_PATH="$TMP/backup-$name.db" SEED_MARKER="$TMP/seed-$name.called" bash "$ROOT_DIR/scripts/deploy-release.sh" "$TMP/source"; then
    echo "Expected $name to fail" >&2
    exit 1
  fi
  test "$(readlink "$DEPLOY_ROOT/current")" = "$current_before"
  test "$(cat "$DEPLOY_ROOT/dev.db")" = "$db_before"
  if [[ "$failure_var" == FAIL_MIGRATION ]]; then
    test "$(cat "$DEPLOY_ROOT/backups/pre-migration-0123456789abcdef0123456789abcdef01234567-100-1.db")" = "$db_before"
  fi
}

for scenario in FAIL_SYNC FAIL_INSTALL FAIL_BUILD FAIL_MIGRATION FAIL_PRE_HEALTH FAIL_PM2 FAIL_POST_HEALTH; do
  expect_failure_preserves_current "$(printf '%s' "$scenario" | tr '[:upper:]' '[:lower:]')" "$scenario"
done

new_root successful
env PATH="$TMP/bin:$PATH" DEPLOY_PATH="$DEPLOY_ROOT" DEPLOY_SHA=0123456789abcdef0123456789abcdef01234567 \
  DEPLOY_RUN_ID=100-1 PM2_APP_NAME=ketohoy APP_DOMAIN=example.test RESEND_API_KEY=test \
  BACKUP_PATH="$TMP/backup-success.db" SEED_MARKER="$TMP/seed-success.called" bash "$ROOT_DIR/scripts/deploy-release.sh" "$TMP/source"
test ! -e "$TMP/seed-success.called"
test "$(readlink "$DEPLOY_ROOT/previous")" = releases/old
test "$(readlink "$DEPLOY_ROOT/current")" = releases/0123456789abcdef0123456789abcdef01234567-100-1
test "$(cat "$DEPLOY_ROOT/dev.db")" = 'persistent sqlite fixture'
test "$(cat "$DEPLOY_ROOT/backups/pre-migration-0123456789abcdef0123456789abcdef01234567-100-1.db")" = 'persistent sqlite fixture'
test -x "$DEPLOY_ROOT/shared/backup-db.py"
grep -Fxq "ACCOUNT_DELETION_LEDGER=$DEPLOY_ROOT/shared/privacy/account-deletions.jsonl" "$DEPLOY_ROOT/shared/.env.local"
test -f "$DEPLOY_ROOT/shared/privacy/account-deletions.jsonl"
python3 - "$DEPLOY_ROOT/shared/privacy" "$DEPLOY_ROOT/shared/privacy/account-deletions.jsonl" <<'PY'
import os, stat, sys
assert stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o700
assert stat.S_IMODE(os.stat(sys.argv[2]).st_mode) == 0o600
PY

env PATH="$TMP/bin:$PATH" DEPLOY_PATH="$DEPLOY_ROOT" PM2_APP_NAME=ketohoy \
  bash "$ROOT_DIR/scripts/rollback-release.sh"
test "$(readlink "$DEPLOY_ROOT/current")" = releases/old
test "$(readlink "$DEPLOY_ROOT/previous")" = releases/0123456789abcdef0123456789abcdef01234567-100-1
echo 'deploy release simulations passed'
