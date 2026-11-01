#!/bin/sh
# Copia lógica de la base de datos (pg_dump comprimido).
#
#   scripts/db-backup.sh [carpeta_destino]
#
# Variables:
#   COMPOSE_FILE  compose a usar (defecto: docker-compose.prod.yml)
#   BACKUP_DIR    carpeta destino (defecto: ./backups)
#
# Ejemplo en el NAS:
#   scripts/db-backup.sh /mnt/tank/backups/atencion
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
BACKUP_DIR=${1:-${BACKUP_DIR:-$ROOT_DIR/backups}}

cd "$ROOT_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "No encuentro $COMPOSE_FILE. Ejecuta desde la carpeta del proyecto." >&2
  exit 1
fi

STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/atencion-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump --no-owner --no-privileges -U atencion -d atencion \
  | gzip > "$OUT"

echo "Copia creada: $OUT"
