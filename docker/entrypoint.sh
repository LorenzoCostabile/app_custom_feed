#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL no está definida." >&2
  exit 1
fi

echo "[entrypoint] Esperando a que PostgreSQL esté disponible..."

node --input-type=module -e '
import postgres from "postgres";
const url = process.env.DATABASE_URL;
for (let attempt = 1; attempt <= 30; attempt += 1) {
  try {
    const sql = postgres(url, { max: 1 });
    await sql`select 1`;
    await sql.end();
    process.exit(0);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
console.error("[entrypoint] No se pudo conectar con la base de datos.");
process.exit(1);
'

echo "[entrypoint] Aplicando migraciones..."
npm run db:migrate

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[entrypoint] Asegurando administrador inicial..."
  npm run db:bootstrap
fi

echo "[entrypoint] Iniciando: $*"
exec "$@"
