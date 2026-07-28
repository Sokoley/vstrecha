# Регистрация гостей (QR + этапы)

Веб-приложение + мобильные оболочки (Android / iOS) для контроля гостей. Данные хранятся в **MariaDB** на сервере ispmanager (база `vstrecha`).

## Возможности

- Обзор по этапам и последние отметки
- Список гостей, поиск и фильтры
- Печать QR-бейджей
- Сканер QR на телефоне
- Одновременная работа ~10 организаторов с одной БД (~300 гостей)

Авторизация не используется.

## Быстрый старт (локально)

```bash
nvm use 20
npm install
COMPOSE_PROJECT_NAME=guestreg docker compose up -d   # локальная MariaDB
npx prisma db push
npm run db:seed
npm run dev
```

Откройте http://localhost:3000

Демо-коды: `G-DEMO0001` … `G-DEMO0010`.

## Продакшен (Docker + ispmanager)

Подробно: [docs/DEPLOY.md](docs/DEPLOY.md)

```bash
# на сервере в каталоге сайта
git pull
# .env с паролем MariaDB
docker compose up -d --build
```

Сайт проксируется на порт **3000**. MariaDB остаётся на хосте (база `vstrecha`).

## Структура

- `/admin` — обзор
- `/admin/guests` — гости
- `/admin/badges` — печать QR
- `/scan` — сканер
- `android/`, `ios/` — нативные проекты Capacitor
