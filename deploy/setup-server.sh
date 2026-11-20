#!/usr/bin/env bash
# Einrichtung / Update auf einem Debian-Server (Netcup): PostgreSQL + App (systemd) + Caddy (HTTPS).
# Als root ausführen, aus dem Projektordner:
#   DOMAIN=152-53-114-139.sslip.io bash deploy/setup-server.sh
# Mehrfach ausführbar: aktualisiert Code, baut neu, wendet neue Migrationen an, startet die App neu.
# Bestehende Datenbank und /etc/hochzeit/env bleiben unangetastet.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "Bitte als root ausführen (sudo)."; exit 1; }
DOMAIN="${DOMAIN:?Bitte DOMAIN setzen, z. B. DOMAIN=152-53-114-139.sslip.io (oder eigene Domain, die auf den Server zeigt)}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR=/opt/hochzeit
ENV_DIR=/etc/hochzeit
ENV_FILE="$ENV_DIR/env"
PORT="${PORT:-3000}"

echo "==> Pakete installieren (postgresql, caddy, rsync, curl)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y postgresql caddy rsync curl ca-certificates openssl

if ! command -v node >/dev/null || ! node -v | grep -Eq '^v(2[2-9]|[3-9][0-9])'; then
  echo "==> Node.js 22 installieren (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Systembenutzer 'hochzeit'"
id hochzeit >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin hochzeit

echo "==> Datenbank und Zugangsdaten"
mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
create role hochzeit_app login password '$DB_PASSWORD';
create database hochzeit owner hochzeit_app;
SQL
  cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgres://hochzeit_app:$DB_PASSWORD@127.0.0.1:5432/hochzeit
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
NODE_ENV=production
ENV
fi
chown root:hochzeit "$ENV_FILE"
chmod 640 "$ENV_FILE"
# Falls die Domain geändert wurde, in der Env-Datei nachziehen.
sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://$DOMAIN|" "$ENV_FILE"

echo "==> Code nach $APP_DIR kopieren"
mkdir -p "$APP_DIR"
rsync -a --delete --exclude node_modules --exclude .next --exclude '.env*' --exclude '.git' "$SRC/" "$APP_DIR/"
chown -R hochzeit:hochzeit "$APP_DIR"

echo "==> Abhängigkeiten installieren und bauen"
sudo -u hochzeit bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && set -a && . '$ENV_FILE' && set +a && npm run build"

echo "==> Datenbank-Migrationen"
sudo -u hochzeit bash -c "cd '$APP_DIR' && set -a && . '$ENV_FILE' && set +a && node scripts/migrate.mjs"

echo "==> systemd-Dienst"
cat > /etc/systemd/system/hochzeit.service <<UNIT
[Unit]
Description=Hochzeit Sarah & Bene (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=hochzeit
Group=hochzeit
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/env node node_modules/next/dist/bin/next start -p $PORT -H 127.0.0.1
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/.next
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable hochzeit
systemctl restart hochzeit

echo "==> Caddy (HTTPS mit automatischem Zertifikat)"
[ -f /etc/caddy/Caddyfile ] && [ ! -f /etc/caddy/Caddyfile.vor-hochzeit ] && cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.vor-hochzeit
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		-Server
	}
	reverse_proxy 127.0.0.1:$PORT
}
CADDY
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "==> Tägliches Datenbank-Backup (14 Tage)"
mkdir -p /var/backups/hochzeit
chown postgres:postgres /var/backups/hochzeit
chmod 700 /var/backups/hochzeit
cat > /etc/cron.d/hochzeit-backup <<'CRON'
17 3 * * * postgres pg_dump hochzeit | gzip > /var/backups/hochzeit/hochzeit-$(date +\%F).sql.gz && find /var/backups/hochzeit -name '*.sql.gz' -mtime +14 -delete
CRON

sleep 2
systemctl is-active hochzeit >/dev/null && echo "App läuft." || { echo "App läuft NICHT – journalctl -u hochzeit -n 50"; exit 1; }
echo
echo "Fertig. Erreichbar unter https://$DOMAIN"
echo "Nächster Schritt: Admin-Konto anlegen:"
echo "  bash $APP_DIR/deploy/create-admin.sh deine@mail.de \"Dein Name\""
