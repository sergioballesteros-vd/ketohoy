#!/usr/bin/env python3
"""Consistent SQLite backup and safe restore for KetoHoy."""

import argparse
from contextlib import closing
import fcntl
import json
import os
import re
import sqlite3
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKUP_RE = re.compile(r"^ketohoy-(\d{8}T\d{12}Z)\.sqlite$")
RETENTION_DAYS = 14


def database_path(value):
    if not value or not value.startswith("file:"):
        raise ValueError("DATABASE_URL must be an absolute file: SQLite URL")
    raw = value[5:]
    if not raw or not Path(raw).is_absolute() or "?" in raw or "#" in raw:
        raise ValueError("DATABASE_URL must be an absolute file: SQLite URL without query options")
    path = Path(raw)
    if path.is_symlink() or not path.is_file():
        raise ValueError("SQLite source must be an existing regular file, not a symlink")
    return path.resolve(strict=True)


def backup_directory(value):
    if not value or not Path(value).is_absolute():
        raise ValueError("BACKUP_DIR must be an absolute directory path")
    path = Path(value)
    if path == Path("/") or path.is_symlink():
        raise ValueError("BACKUP_DIR must be a dedicated non-root directory")
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if not path.is_dir():
        raise ValueError("BACKUP_DIR is not a directory")
    path.chmod(0o700)
    return path.resolve(strict=True)


def open_database(path, readonly=False):
    if readonly:
        uri = "file:" + path.as_posix() + "?mode=ro"
        db = sqlite3.connect(uri, uri=True, timeout=30)
    else:
        db = sqlite3.connect(path, timeout=30)
    db.execute("PRAGMA busy_timeout=30000")
    return db


def verify(path):
    with closing(open_database(path, readonly=True)) as db:
        check = db.execute("PRAGMA integrity_check").fetchone()
        if check != ("ok",):
            raise ValueError("SQLite integrity_check failed")
        if db.execute("PRAGMA foreign_key_check").fetchone() is not None:
            raise ValueError("SQLite foreign_key_check failed")
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_schema WHERE type='table'")}
        required = {"User", "PantryItem", "ShoppingListItem", "WeeklyPlan"}
        if not required.issubset(tables):
            raise ValueError("SQLite KetoHoy schema is incomplete")
        if "_prisma_migrations" in tables:
            invalid = db.execute(
                "SELECT 1 FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1"
            ).fetchone()
            if invalid:
                raise ValueError("SQLite has an incomplete Prisma migration")
        db.execute("SELECT 1").fetchone()
        counts = {
            table: db.execute('SELECT count(*) FROM "' + table + '"').fetchone()[0]
            for table in ("User", "PantryItem", "ShoppingListItem", "WeeklyPlan")
        }
        return counts


def deletion_ledger_path():
    value = os.environ.get("ACCOUNT_DELETION_LEDGER")
    if not value or not Path(value).is_absolute():
        raise ValueError("ACCOUNT_DELETION_LEDGER must name the external deletion ledger")
    path = Path(value)
    if path.is_symlink() or not path.is_file():
        raise ValueError("account deletion ledger must be an existing regular file")
    return path.resolve(strict=True)


def apply_deletions(database, ledger):
    user_ids = set()
    with ledger.open("r", encoding="utf-8") as records:
        for line in records:
            record = json.loads(line)
            if not isinstance(record, dict) or not isinstance(record.get("userId"), str) or not record["userId"] or not isinstance(record.get("deletedAt"), str):
                raise ValueError("account deletion ledger contains an invalid record")
            user_ids.add(record["userId"])

    with closing(sqlite3.connect(database)) as db:
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("BEGIN IMMEDIATE")
        for user_id in sorted(user_ids):
            product_ids = [row[0] for row in db.execute(
                'SELECT id FROM "Product" WHERE ownerId=? AND source=?', (user_id, "manual")
            )]
            if product_ids:
                marks = ",".join("?" for _ in product_ids)
                db.execute(f'UPDATE "RecipeIngredient" SET productId=NULL WHERE productId IN ({marks})', product_ids)
            db.execute('DELETE FROM "User" WHERE id=?', (user_id,))
            if product_ids:
                db.execute(f'DELETE FROM "Product" WHERE id IN ({marks})', product_ids)
        if db.execute("PRAGMA foreign_key_check").fetchone() is not None:
            raise ValueError("account deletion reconciliation failed foreign-key checks")
        db.commit()


def make_backup(source, directory):
    if source == directory or source.parent == directory:
        raise ValueError("BACKUP_DIR must be separate from the SQLite source directory")
    lock_path = directory / ".backup.lock"
    lock_fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        os.fchmod(lock_fd, 0o600)
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ValueError("another backup is already running") from exc

        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        target = directory / ("ketohoy-" + stamp + ".sqlite")
        if target.exists():
            raise ValueError("backup name already exists; refusing to overwrite it")
        fd, temp_name = tempfile.mkstemp(prefix=".ketohoy-", suffix=".tmp", dir=directory)
        os.close(fd)
        temp = Path(temp_name)
        os.chmod(temp, 0o600)
        try:
            with closing(open_database(source, readonly=True)) as src, closing(sqlite3.connect(temp)) as dst:
                src.backup(dst)
            verify(temp)
            with temp.open("rb") as handle:
                os.fsync(handle.fileno())
            os.replace(temp, target)
            os.chmod(target, 0o600)
            dir_fd = os.open(directory, os.O_RDONLY)
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
        finally:
            temp.unlink(missing_ok=True)

        cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
        valid = []
        for candidate in directory.iterdir():
            match = BACKUP_RE.fullmatch(candidate.name)
            if match and candidate.is_file() and not candidate.is_symlink():
                try:
                    created = datetime.strptime(match.group(1), "%Y%m%dT%H%M%S%fZ").replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
                valid.append((created, candidate))
        newest = max((item[0] for item in valid), default=None)
        for created, candidate in valid:
            if candidate != target and created < cutoff and created != newest:
                candidate.unlink()
        print("backup ok: " + target.name)
    finally:
        os.close(lock_fd)


def restore(backup, destination):
    if not backup.is_absolute() or not backup.is_file() or backup.is_symlink():
        raise ValueError("backup must be an explicit existing regular file")
    if not destination.is_absolute() or destination.exists() or destination.is_symlink():
        raise ValueError("restore destination must be an absolute path that does not exist")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination_parent = destination.parent.resolve(strict=True)
    destination = destination_parent / destination.name
    if destination == backup.resolve(strict=True):
        raise ValueError("restore destination cannot be the backup source")
    if os.environ.get("DATABASE_URL"):
        active = database_path(os.environ["DATABASE_URL"])
        if destination == active:
            raise ValueError("refusing to restore over the active DATABASE_URL")

    ledger = deletion_ledger_path()
    fd, temp_name = tempfile.mkstemp(prefix=".ketohoy-restore-", suffix=".tmp", dir=destination_parent)
    os.close(fd)
    temp = Path(temp_name)
    os.chmod(temp, 0o600)
    try:
        with closing(open_database(backup.resolve(strict=True), readonly=True)) as src, closing(sqlite3.connect(temp)) as dst:
            src.backup(dst)
        apply_deletions(temp, ledger)
        verify(temp)
        os.link(temp, destination)
        os.chmod(destination, 0o600)
        print("restore ok: " + str(destination))
    finally:
        temp.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("backup")
    restore_parser = sub.add_parser("restore")
    restore_parser.add_argument("backup")
    restore_parser.add_argument("destination")
    args = parser.parse_args()
    try:
        if args.command == "backup":
            source = database_path(os.environ.get("DATABASE_URL"))
            directory = backup_directory(os.environ.get("BACKUP_DIR"))
            make_backup(source, directory)
        else:
            restore(Path(args.backup), Path(args.destination))
    except (OSError, sqlite3.Error, ValueError) as exc:
        print("backup/restore failed: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
