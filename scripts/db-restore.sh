#!/bin/sh
# Restaura una copia creada por db-backup.sh en una base VACÍA.
#
#   scripts/db-restore.sh backups/atencion-20260101-070000.sql.gz
#
# Si la base ya tiene usuarios, aborta: así no se mezclan datos por accidente.
# Para empezar de cero, baja los servicios y borra el volumen antes de restaurar:
#   docker compose -f docker-compose.prod.yml down
#   docker volume rm <proyecto>_pgdata
set -eu

FILE=${1:?uso: scripts/db-restore.sh <copia.sql.gz>}
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}

cd "$ROOT_DIR"

if [ ! -f "$FILE" ]; then
  echo "No encuentro el archivo $FILE." >&2
  exit 1
fi

ROWS=$(docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U atencion -d atencion -tAc "select count(*) from users" \
  | tr -d '[:space:]')

if [ "${ROWS:-0}" != "0" ]; then
  echo "La base ya tiene $ROWS usuarios. Restaura sobre una base vacía." >&2
  exit 1
fi

gunzip -c "$FILE" | docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U atencion -d atencion -v ON_ERROR_STOP=1 -q

echo "Copia restaurada desde $FILE"
