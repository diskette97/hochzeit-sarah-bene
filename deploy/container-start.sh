#!/usr/bin/env bash
# Startet im Container: PostgreSQL (nur 127.0.0.1) -> Migrationen -> tägliches Backup -> App.
# Das Datenbankpasswort wird beim ersten Start erzeugt und im Datenvolume abgelegt.
set -euo pipefail

PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
PASS_FILE="$PGDATA/.app-passwort"

mkdir -p "$PGDATA" "$BACKUP_DIR"
chown postgres:postgres "$PGDATA" "$BACKUP_DIR"
chmod 700 "$PGDATA"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "==> Datenbank wird neu angelegt"
  gosu postgres "$PGBIN/initdb" -D "$PGDATA" --encoding=UTF8 --auth-local=peer --auth-host=scram-sha-256 >/dev/null
fi

gosu postgres "$PGBIN/pg_ctl" -D "$PGDATA" -w -t 60 -l "$PGDATA/server.log" \
  -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp -c port=5432" start

if [ ! -s "$PASS_FILE" ]; then
  umask 077
  openssl rand -hex 24 > "$PASS_FILE" 2>/dev/null || head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$PASS_FILE"
  chown postgres:postgres "$PASS_FILE"
  DBPW="$(cat "$PASS_FILE")"
  gosu postgres psql -h /tmp -v ON_ERROR_STOP=1 -d postgres >/dev/null <<SQL
create role hochzeit_app login password '$DBPW';
create database hochzeit owner hochzeit_app;
SQL
fi
export DATABASE_URL="postgres://hochzeit_app:$(cat "$PASS_FILE")@127.0.0.1:5432/hochzeit"

echo "==> Migrationen"
node scripts/migrate.mjs

# Tägliches Backup (14 Tage) im Hintergrund.
(
  while true; do
    sleep 86400 &
    wait $!
    gosu postgres pg_dump -h /tmp hochzeit | gzip > "$BACKUP_DIR/hochzeit-$(date +%F).sql.gz" || true
    find "$BACKUP_DIR" -name '*.sql.gz' -mtime +14 -delete || true
  done
) &

stop() { kill "${APP_PID:-0}" 2>/dev/null || true; gosu postgres "$PGBIN/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null 2>&1 || true; exit 0; }
trap stop TERM INT

echo "==> App startet auf Port $PORT"
gosu node node node_modules/next/dist/bin/next start -p "$PORT" -H 0.0.0.0 &
APP_PID=$!
wait "$APP_PID"
stop
