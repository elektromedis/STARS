#!/bin/sh
# Dijalankan tiap kontainer start: terapkan migrasi (idempoten) lalu jalankan server.
# Master unit kerja dan Super Admin pertama dibuat otomatis oleh src/instrumentation.ts saat server start.
set -e
echo "[entrypoint] DATABASE_URL=$DATABASE_URL  STARS_MODE=${STARS_MODE:-intranet}"
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
exec node server.js
