#!/usr/bin/env bash
# Admin-Konto im laufenden Container anlegen (fragt das Passwort ab):
#   docker exec -it hochzeit /app/deploy/container-admin.sh deine@mail.de "Dein Name"
set -euo pipefail
[ $# -ge 2 ] || { echo 'Aufruf: container-admin.sh <email> "<Name>"'; exit 1; }
export DATABASE_URL="postgres://hochzeit_app:$(cat /var/lib/postgresql/data/.app-passwort)@127.0.0.1:5432/hochzeit"
cd /app
exec gosu node node scripts/create-admin.mjs "$@"
