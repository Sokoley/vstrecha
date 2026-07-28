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

## Продакшен (ispmanager + телефоны)

Подробно: [docs/DEPLOY.md](docs/DEPLOY.md)

Кратко:

1. БД `vstrecha` + пользователь `db_wp_user` (привязана к сайту).
2. На том же сервере запустить Next.js для **https://vstrecha.smazka.ru** с  
   `DATABASE_URL=mysql://db_wp_user:ПАРОЛЬ@127.0.0.1:3306/vstrecha`
3. Собрать APK (Android Studio) / IPA (Xcode) через Capacitor — приложение открывает `https://vstrecha.smazka.ru`.

```bash
npx cap sync
npm run cap:android   # Android Studio → APK
npm run cap:ios       # Xcode → установка на iPhone
```

## Структура

- `/admin` — обзор
- `/admin/guests` — гости
- `/admin/badges` — печать QR
- `/scan` — сканер
- `android/`, `ios/` — нативные проекты Capacitor
