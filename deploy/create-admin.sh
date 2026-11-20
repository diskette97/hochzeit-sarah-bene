#!/usr/bin/env bash
# Legt ein Admin-Konto an (fragt das Passwort ab). Als root ausführen.
#   bash deploy/create-admin.sh bene@example.de "Bene"
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Bitte als root ausführen (sudo)."; exit 1; }
[ $# -ge 2 ] || { echo 'Aufruf: create-admin.sh <email> "<Name>"'; exit 1; }
EMAIL="$1"; shift
sudo -u hochzeit bash -c 'cd /opt/hochzeit && set -a && . /etc/hochzeit/env && set +a && node scripts/create-admin.mjs "$0" "$@"' "$EMAIL" "$@"
