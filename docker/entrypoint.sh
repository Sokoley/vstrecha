#!/bin/sh
set -e

echo "→ DATABASE_URL host check..."
echo "   (127.0.0.1 внутри контейнера = хост только при network_mode: host)"

i=0
until node ./node_modules/prisma/build/index.js db push; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "× Не удалось подключиться к MariaDB за 30 попыток."
    echo "  Проверьте на хосте: ss -tlnp | grep 3306"
    echo "  и: docker inspect vstrecha-app --format '{{.HostConfig.NetworkMode}}'"
    exit 1
  fi
  echo "  БД недоступна, повтор через 3с ($i/30)..."
  sleep 3
done

echo "→ Seed..."
node prisma/seed.js || true

echo "→ Starting Next.js on :${PORT:-3000}..."
exec node server.js
