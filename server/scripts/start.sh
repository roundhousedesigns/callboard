#!/bin/sh
set -e
cd /app
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true
exec node server/dist/index.js
