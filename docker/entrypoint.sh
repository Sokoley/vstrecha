#!/bin/sh
set -e

echo "→ Prisma db push..."
node ./node_modules/prisma/build/index.js db push

echo "→ Seed..."
node prisma/seed.js || true

echo "→ Starting Next.js on :3000..."
exec node server.js
