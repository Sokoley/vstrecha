# Деплой и мобильные приложения

## Архитектура

```
Телефоны организаторов (Capacitor: Android APK / iOS)
        │  HTTPS
        ▼
Next.js на сервере ispmanager  ──localhost──►  MariaDB (база vstrecha)
```

- БД создана в ispmanager: **vstrecha**, пользователь **db_wp_user**, MariaDB 10.3, utf8mb4.
- **Удалённый доступ к БД включать не нужно** — сайт и API работают на том же сервере и ходят в MySQL по `127.0.0.1`.
- ~10 организаторов сканируют одновременно — одна общая MariaDB; повторная отметка одного этапа защищена уникальным ключом.

## 1. База в ispmanager

1. Создайте БД (как на скрине): имя `vstrecha`, пользователь `db_wp_user`, utf8mb4.
2. Запомните пароль пользователя БД.
3. На сервере в `.env` приложения:

```env
DATABASE_URL="mysql://db_wp_user:ВАШ_ПАРОЛЬ@127.0.0.1:3306/vstrecha"
NEXT_PUBLIC_APP_URL="https://vstrecha.smazka.ru"
```

4. На сервере:

```bash
nvm use 20   # или системный Node >= 18.17
npm ci
npx prisma db push
npm run db:seed
npm run build
npm start    # или через PM2 / systemd на порту 3000 за nginx
```

Пример nginx: проксировать `https://vstrecha.smazka.ru` → `http://127.0.0.1:3000`.

## 2. Локальная разработка (опционально)

Нужен Docker Desktop:

```bash
COMPOSE_PROJECT_NAME=guestreg docker compose up -d
# .env уже содержит mysql://db_wp_user:localpass@127.0.0.1:3306/vstrecha
npx prisma db push
npm run db:seed
npm run dev
```

## 3. Сборка приложения для телефонов

Приложение — оболочка Capacitor, которая открывает ваш сайт. Все телефоны пишут в одну БД на сервере.

1. В `.env` укажите боевой URL (уже задан):

```env
NEXT_PUBLIC_APP_URL="https://vstrecha.smazka.ru"
```

2. Синхронизируйте нативные проекты:

```bash
npx cap sync
```

### Android (установка с компьютера)

1. Установите [Android Studio](https://developer.android.com/studio).
2. Откройте проект:

```bash
npm run cap:android
```

3. Build → Build Bundle(s) / APK → APK.
4. APK лежит в `android/app/build/outputs/apk/…`.
5. Подключите телефон по USB (или скопируйте APK) и установите на ~10 устройств организаторов.
6. Разрешите камеру при первом запуске.

### iPhone (установка с компьютера)

1. Нужны Mac, Xcode и Apple ID (лучше Developer Program для стабильной установки на несколько устройств).
2. Установите CocoaPods, затем:

```bash
cd ios/App && pod install && cd ../..
npm run cap:ios
```

3. В Xcode выберите Team (Signing), подключите iPhone, нажмите Run — или Archive для распространения.
4. Без платного аккаунта приложение живёт ~7 дней и ставится только на ваших устройствах.
5. Для 10 организаторов удобнее TestFlight или Ad Hoc с Developer Program.

## 4. Что ещё нужно

- Пароль пользователя `db_wp_user`
- Деплой Next.js на `https://vstrecha.smazka.ru` (Node за nginx/proxy)

После этого в `.env` на сервере прописывается `DATABASE_URL` с паролем, делается `db push` + `seed`, собираются APK/IPA.

## 5. Одновременное сканирование

- Все клиенты ходят в один API и одну MariaDB.
- Уникальный индекс `(guestId, stageId)` не даёт двойной отметки, даже если два телефона нажали «Регистрация» в одну секунду.
