# Деплой в Docker (ispmanager)

Сайт: **https://vstrecha.smazka.ru**  
БД MariaDB на хосте (не в контейнере): `vstrecha` / `db_wp_user`

## Зачем Docker

Node ставится **внутри контейнера**, хост (старый CentOS / glibc) не трогаем.

## 1. Очистить прошлую установку Node на сервере

```bash
cd /var/www/www-root/data/www/vstrecha.smazka.ru
rm -rf .node node_modules .next
```

## 2. Обновить код с GitHub

```bash
cd /var/www/www-root/data/www/vstrecha.smazka.ru
git pull
```

## 3. Файл `.env` на сервере

```env
DATABASE_URL="mysql://db_wp_user:ВАШ_ПАРОЛЬ@127.0.0.1:3306/vstrecha"
NEXT_PUBLIC_APP_URL="https://vstrecha.smazka.ru"
```

`127.0.0.1` работает, потому что контейнер идёт с `network_mode: host` (видит MariaDB хоста).

## 4. Запуск через Docker / ispmanager

### Вариант A — из терминала

```bash
cd /var/www/www-root/data/www/vstrecha.smazka.ru
docker compose up -d --build
docker compose logs -f app
```

Приложение слушает **порт 3000** на сервере.

### Вариант B — контейнер в панели ispmanager

1. В ispmanager откройте Docker / контейнеры.
2. Соберите образ из каталога сайта (Dockerfile в корне репозитория) **или** выполните на сервере `docker compose build`.
3. Запуск контейнера:
   - образ: собранный `vstrecha-app` / имя из compose
   - **network mode: host** (важно для доступа к MariaDB на 127.0.0.1)
   - env из `.env` (или те же переменные вручную)
   - restart: unless-stopped
4. В настройках сайта `vstrecha.smazka.ru` сделайте **прокси** (reverse proxy) на `http://127.0.0.1:3000`, а не раздачу статичного `index.html`.

## 5. Проверка

```bash
curl -I http://127.0.0.1:3000
```

В браузере: https://vstrecha.smazka.ru

## Обновление

```bash
cd /var/www/www-root/data/www/vstrecha.smazka.ru
git pull
docker compose up -d --build
```

## Локально (у себя на Mac)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Откроется http://localhost:3000 с MariaDB в Docker.
