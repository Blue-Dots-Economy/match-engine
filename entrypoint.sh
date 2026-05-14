#!/bin/sh

wait_for_db() {
  _retries=0
  _max_retries=15
  _host="${POSTGRES_HOST:-localhost}"
  _port="${POSTGRES_PORT:-5432}"
  echo "Waiting for database at ${_host}:${_port}..."
  while [ $_retries -lt $_max_retries ]; do
    _retries=$((_retries + 1))
    if pnpm exec drizzle-kit push:pg --config drizzle.config.ts; then
      echo "Database schema applied."
      return 0
    fi
    echo "DB not ready (${_retries}/${_max_retries}). Retrying in 3 seconds..."
    sleep 3
  done
  echo "Schema push failed after ${_max_retries} attempts. Continuing anyway..."
}

echo "Applying database schema..."
wait_for_db || echo "Schema push skipped."

echo "Starting server..."
exec node dist/server.js