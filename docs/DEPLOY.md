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

### Перед запуском — проверить MariaDB на хосте

```bash
ss -tlnp | grep 3306
# должно быть что-то вроде 127.0.0.1:3306

mysql -h127.0.0.1 -P3306 -udb_wp_user -p -e "SELECT 1"
# или: mysqladmin -h127.0.0.1 ping
```

Если порт 3306 не слушается — в ispmanager запустите службу MariaDB.

### Вариант A — из терминала (`network_mode: host`)

```bash
cd /var/www/www-root/data/www/vstrecha.smazka.ru
docker compose down
docker compose up -d --build
docker inspect vstrecha-app --format '{{.HostConfig.NetworkMode}}'
# ожидается: host
docker compose logs -f
```

Приложение слушает **порт 3001** на сервере (у `brand.smazka.ru` уже занят `:3000`). В `.env` оставляйте `127.0.0.1` для БД.

В Apache для vstrecha проксируйте на `http://127.0.0.1:3001/` (как у brand, но порт 3001).

### Если NetworkMode не `host`

Тогда `127.0.0.1` внутри контейнера — это сам контейнер, не MariaDB. В `.env` замените хост на шлюз Docker:

```env
DATABASE_URL="mysql://db_wp_user:ПАРОЛЬ@172.17.0.1:3306/vstrecha"
```

И в `docker-compose.yml` временно уберите `network_mode: host`, добавьте:

```yaml
ports:
  - "3000:3000"
extra_hosts:
  - "host.docker.internal:host-gateway"
```

(или используйте `172.17.0.1` как выше).

MariaDB должна принимать TCP с Docker-сети (часто уже слушает 127.0.0.1 — тогда нужен именно `network_mode: host`).

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
