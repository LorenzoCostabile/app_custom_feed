#!/bin/sh
# Restaura una copia creada por db-backup.sh sobre una base SIN usuarios.
#
#   scripts/db-restore.sh backups/atencion-20260101-070000.sql.gz
#
# Si la base ya tiene usuarios, aborta: así no se mezclan datos por accidente.
# Si está vacía (o solo tiene el esquema de migraciones), se reconstruye el
# esquema `public` y se carga el volcado, que trae su propio esquema y su tabla
# de migraciones.
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
  psql -U atencion -d atencion -tAc \
  "select case when to_regclass('public.users') is null then 0 else (select count(*) from users) end" \
  | tr -d '[:space:]')

if [ "${ROWS:-0}" != "0" ]; then
  echo "La base ya tiene $ROWS usuarios. Restaura sobre una base vacía." >&2
  exit 1
fi

echo "Reconstruyendo el esquema public..."
docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U atencion -d atencion -v ON_ERROR_STOP=1 -q \
  -c "drop schema if exists public cascade" \
  -c "create schema public"

echo "Cargando $FILE..."
gunzip -c "$FILE" | docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U atencion -d atencion -v ON_ERROR_STOP=1 -q

echo "Copia restaurada desde $FILE"
