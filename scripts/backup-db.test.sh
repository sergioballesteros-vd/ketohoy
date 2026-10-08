#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; fi
  rm -rf "$TMP"
}
trap cleanup EXIT
DB="$TMP/source database.sqlite"
BACKUPS="$TMP/backup directory"
LEDGER="$TMP/account-deletions.jsonl"
RESTORED="$TMP/restore directory/restored database.sqlite"
RECONCILED="$TMP/restore directory/reconciled database.sqlite"
CORRUPT="$TMP/corrupt.sqlite"
mkdir -p "$(dirname "$RESTORED")"
touch "$DB"

(cd "$ROOT" && DATABASE_URL="file:$DB" npx prisma migrate deploy >/dev/null)
touch "$LEDGER"
python3 - "$DB" <<'PY'
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.execute("PRAGMA foreign_keys=ON")
db.executescript("""
INSERT INTO User (id,email,createdAt) VALUES ('u1','backup-test@example.invalid','2026-10-06T00:00:00.000Z');
INSERT INTO User (id,email,createdAt) VALUES ('u2','backup-other@example.invalid','2026-10-06T00:00:00.000Z');
INSERT INTO UserPreferences (id,ketoMode,updatedAt,userId) VALUES ('pref1','strict','2026-10-06T00:00:00.000Z','u1');
INSERT INTO Product (id,name,category,updatedAt,ownerId) VALUES ('prod1','Backup sentinel product','vegetables','2026-10-06T00:00:00.000Z','u1');
INSERT INTO Product (id,name,category,source,updatedAt) VALUES ('shared1','Shared catalog sentinel','vegetables','mercadona','2026-10-06T00:00:00.000Z');
INSERT INTO Product (id,name,category,updatedAt,ownerId) VALUES ('prod2','Other account sentinel','nuts','2026-10-06T00:00:00.000Z','u2');
INSERT INTO PantryItem (id,productId,quantity,unit,updatedAt,userId) VALUES ('pantry1','prod1',42.5,'g','2026-10-06T00:00:00.000Z','u1');
INSERT INTO Recipe (id,title,description,mealTypes,prepTimeMinutes,difficulty,ketoLevel,steps,updatedAt)
VALUES ('recipe1','Backup sentinel meal','Restore drill','[\"lunch\"]',10,'easy','strict','[\"Cook\"]','2026-10-06T00:00:00.000Z');
INSERT INTO WeeklyPlan (id,weekStart,updatedAt,userId) VALUES ('plan1','2026-10-05T00:00:00.000Z','2026-10-06T00:00:00.000Z','u1');
INSERT INTO WeeklyMeal (id,planId,recipeId,dayOfWeek,mealType) VALUES ('meal1','plan1','recipe1',0,'lunch');
INSERT INTO RecipeIngredient (id,recipeId,productId,name,quantity) VALUES ('ingredient1','recipe1','prod1','Private ingredient name','1 unit');
INSERT INTO ShoppingListItem (id,name,quantity,updatedAt,userId) VALUES ('shop1','Shopping restore sentinel','2 jars','2026-10-06T00:00:00.000Z','u1');
INSERT INTO Session (id,userId,expiresAt) VALUES ('session1','u1','2026-10-07T00:00:00.000Z');
INSERT INTO AuthToken (id,userId,type,expiresAt) VALUES ('token1','u1','reset','2026-10-07T00:00:00.000Z');
INSERT INTO UserPreferences (id,ketoMode,updatedAt,userId) VALUES ('pref2','flexible','2026-10-06T00:00:00.000Z','u2');
""")
db.commit()
db.close()
PY

export DATABASE_URL="file:$DB" BACKUP_DIR="$BACKUPS" ACCOUNT_DELETION_LEDGER="$LEDGER"
python3 - "$DB" "$ROOT/scripts/backup-db.py" "$BACKUPS" <<'PY'
import os, sqlite3, subprocess, sys
db_path, script, backup_dir = sys.argv[1:]
writer = sqlite3.connect(db_path)
writer.execute("PRAGMA journal_mode=WAL")
writer.execute("PRAGMA wal_autocheckpoint=0")
writer.execute("UPDATE PantryItem SET quantity=43.5 WHERE id='pantry1'")
writer.commit()
assert os.path.exists(db_path + '-wal')
env = dict(os.environ, DATABASE_URL='file:' + db_path, BACKUP_DIR=backup_dir)
subprocess.run([sys.executable, script, 'backup'], env=env, check=True)
# Keep a second writer open and prove this snapshot retained the committed WAL state.
writer.execute("UPDATE PantryItem SET quantity=44.5 WHERE id='pantry1'")
writer.commit()
writer.close()
PY
BACKUP="$(find "$BACKUPS" -maxdepth 1 -name 'ketohoy-*.sqlite' -print -quit)"
test -n "$BACKUP"
python3 - "$BACKUP" <<'PY'
import os, stat, sys
assert stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o600
PY
python3 - "$DB" <<'PY'
import sqlite3, sys
db=sqlite3.connect(sys.argv[1]); db.execute("UPDATE PantryItem SET quantity=1 WHERE id='pantry1'"); db.execute("DELETE FROM ShoppingListItem WHERE id='shop1'"); db.commit(); db.close()
PY
python3 "$ROOT/scripts/backup-db.py" restore "$BACKUP" "$RESTORED"
python3 - "$RESTORED" "$DB" <<'PY'
import sqlite3, sys
restored=sqlite3.connect(sys.argv[1]); source=sqlite3.connect(sys.argv[2])
assert restored.execute("PRAGMA integrity_check").fetchone() == ('ok',)
assert restored.execute("PRAGMA foreign_key_check").fetchall() == []
assert restored.execute("SELECT quantity FROM PantryItem WHERE id='pantry1'").fetchone() == (43.5,)
assert restored.execute("SELECT mealType FROM WeeklyMeal WHERE id='meal1'").fetchone() == ('lunch',)
assert restored.execute("SELECT name FROM ShoppingListItem WHERE id='shop1'").fetchone() == ('Shopping restore sentinel',)
assert restored.execute("SELECT ketoMode FROM UserPreferences WHERE id='pref1'").fetchone() == ('strict',)
assert restored.execute("SELECT migration_name FROM _prisma_migrations ORDER BY migration_name").fetchall() == source.execute("SELECT migration_name FROM _prisma_migrations ORDER BY migration_name").fetchall()
restored.close(); source.close()
PY

# Restoring a pre-deletion snapshot must reapply the separately retained tombstone before publication.
printf '%s\n' '{"userId":"u1","deletedAt":"2026-10-07T00:00:00.000Z"}' > "$LEDGER"
python3 "$ROOT/scripts/backup-db.py" restore "$BACKUP" "$RECONCILED"
python3 - "$RECONCILED" <<'PY'
import sqlite3, sys
db=sqlite3.connect(sys.argv[1])
assert db.execute("SELECT count(*) FROM User WHERE id='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM UserPreferences WHERE userId='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM PantryItem WHERE userId='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM ShoppingListItem WHERE userId='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM WeeklyPlan WHERE userId='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM WeeklyMeal WHERE id='meal1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM Session WHERE userId='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM AuthToken WHERE userId='u1'").fetchone() == (0,)
assert db.execute("SELECT count(*) FROM Product WHERE id='prod1'").fetchone() == (0,)
assert db.execute("SELECT productId,name FROM RecipeIngredient WHERE id='ingredient1'").fetchone() == (None,'Private ingredient name')
assert db.execute("SELECT count(*) FROM User WHERE id='u2'").fetchone() == (1,)
assert db.execute("SELECT count(*) FROM Product WHERE id='prod2'").fetchone() == (1,)
assert db.execute("SELECT count(*) FROM Product WHERE id='shared1'").fetchone() == (1,)
assert db.execute("PRAGMA integrity_check").fetchone() == ('ok',)
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
db.close()
PY

if [ "${RUN_APP_HEALTH:-0}" = 1 ]; then
  PORT=3181 DATABASE_URL="file:$RESTORED" APP_URL=http://127.0.0.1:3181 COOKIE_SECURE=false \
    npm --prefix "$ROOT" run start -- --hostname 127.0.0.1 --port 3181 >"$TMP/app.log" 2>&1 &
  SERVER_PID=$!
  ready=0
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3181/api/health >"$TMP/health.json" 2>/dev/null; then ready=1; break; fi
    sleep 1
  done
  test "$ready" = 1
  grep -q '"status":"ok"' "$TMP/health.json"
  test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3181/login)" = 200
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  SERVER_PID=""
fi

expect_failure() {
  if "$@" >/dev/null 2>&1; then echo "expected failure: $*" >&2; exit 1; fi
}
expect_failure env DATABASE_URL="file:$TMP/missing.sqlite" BACKUP_DIR="$BACKUPS" python3 "$ROOT/scripts/backup-db.py" backup
expect_failure env DATABASE_URL="postgres://invalid" BACKUP_DIR="$BACKUPS" python3 "$ROOT/scripts/backup-db.py" backup
touch "$TMP/not-a-directory"
expect_failure env DATABASE_URL="file:$DB" BACKUP_DIR="$TMP/not-a-directory/child" python3 "$ROOT/scripts/backup-db.py" backup
expect_failure python3 "$ROOT/scripts/backup-db.py" restore "$TMP/missing.sqlite" "$TMP/missing-restore.sqlite"
expect_failure env -u ACCOUNT_DELETION_LEDGER python3 "$ROOT/scripts/backup-db.py" restore "$BACKUP" "$TMP/no-ledger.sqlite"
printf '%s\n' '{invalid-json' > "$LEDGER"
expect_failure python3 "$ROOT/scripts/backup-db.py" restore "$BACKUP" "$TMP/bad-ledger.sqlite"
test ! -e "$TMP/bad-ledger.sqlite"
printf '%s\n' '{"userId":"u1","deletedAt":"2026-10-07T00:00:00.000Z"}' > "$LEDGER"
expect_failure python3 "$ROOT/scripts/backup-db.py" restore "$BACKUP" "$RESTORED"
expect_failure env DATABASE_URL="file:$DB" python3 "$ROOT/scripts/backup-db.py" restore "$BACKUP" "$DB"
cp "$BACKUP" "$CORRUPT"
truncate -s 128 "$CORRUPT"
expect_failure python3 "$ROOT/scripts/backup-db.py" restore "$CORRUPT" "$TMP/corrupt-restore.sqlite"
test ! -e "$TMP/corrupt-restore.sqlite"
expect_failure env DATABASE_URL="file:$CORRUPT" BACKUP_DIR="$BACKUPS" python3 "$ROOT/scripts/backup-db.py" backup
test -f "$BACKUP"

# An occupied flock must fail without publishing a partial snapshot.
python3 - "$BACKUPS/.backup.lock" "$ROOT/scripts/backup-db.py" "$DB" "$BACKUPS" <<'PY'
import fcntl, os, subprocess, sys
with open(sys.argv[1], 'w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    env = dict(os.environ, DATABASE_URL='file:' + sys.argv[3], BACKUP_DIR=sys.argv[4])
    result = subprocess.run([sys.executable, sys.argv[2], 'backup'], env=env, capture_output=True)
    assert result.returncode != 0 and b'already running' in result.stderr
PY

# A stale valid snapshot is pruned only after a new verified backup is published.
touch "$BACKUPS/ketohoy-20200101T000000000000Z.sqlite"
python3 "$ROOT/scripts/backup-db.py" backup
test ! -e "$BACKUPS/ketohoy-20200101T000000000000Z.sqlite"
echo 'backup/restore simulations passed'
