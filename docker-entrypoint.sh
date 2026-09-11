#!/bin/sh
set -e

# Restaura la base de datos inicial SOLO la primera vez (si está vacía).
# Usa la red interna de Coolify (DATABASE_URL). Esto carga datos, no compila.
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Esperando a PostgreSQL..."
  for i in $(seq 1 40); do
    if psql "$DATABASE_URL" -c 'SELECT 1' >/dev/null 2>&1; then break; fi
    sleep 2
  done

  if psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.mundos')" 2>/dev/null | grep -q mundos; then
    echo "[entrypoint] La BD ya está inicializada; se omite la restauración."
  elif [ -f /app/database/codexia_dump.sql ]; then
    echo "[entrypoint] Restaurando la BD inicial desde el dump..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/database/codexia_dump.sql
    echo "[entrypoint] Restauración completada."
  else
    echo "[entrypoint] Sin dump inicial (BD vacía); la app arranca de todos modos."
  fi

  # Migraciones incrementales. Son SQL idempotente (ADD COLUMN IF NOT EXISTS,
  # CREATE TABLE IF NOT EXISTS...), asi que correrlas en cada arranque es seguro
  # y no toca datos existentes. Se aplican SIEMPRE, tambien sobre una BD que ya
  # estaba inicializada: es justo el caso de produccion.
  if [ -d /app/database/migraciones ]; then
    for m in /app/database/migraciones/*.sql; do
      [ -f "$m" ] || continue
      echo "[entrypoint] Aplicando migracion $(basename "$m")..."
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$m"
    done
    echo "[entrypoint] Migraciones al dia."
  fi
fi

exec node backend/dist/server.js
