# Первый деплой Way of Life

Пошаговый чек-лист, по которому прошёл первый деплой 28.09.2026 (шаг 01.10). Общее
устройство релизов (CI → миграции → Vercel) — в [deployment.md](./deployment.md).

Регион везде Франкфурт: Neon `aws-eu-central-1`, Vercel `fra1` (задан в `vercel.json`) —
ближайшая к Алматы пара.

**Секреты** — пароли и URL с паролями — не вставлять в чат, в файлы репозитория и в
историю shell. Генерировать и вводить только в своём терминале, ввод — через `read -rs`.

---

## 1. Neon: проект и роли

1. [console.neon.tech](https://console.neon.tech) → **New project**: name `way-of-life`,
   регион **AWS Europe Central 1 (Frankfurt)**, база `neondb` (владелец `neondb_owner`).
   Версию Postgres Neon выбрал сам — **18**; локальная база, CI и образ бэкапа на ней же (D18).
2. Пароль runtime-роли, в своём терминале:
   ```bash
   openssl rand -base64 32 | tr -d '/+=' | cut -c1-32
   ```
3. **SQL Editor** → база `neondb`:
   ```sql
   CREATE ROLE way_of_life_app
     LOGIN PASSWORD '<пароль>'
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
   GRANT CONNECT ON DATABASE neondb TO way_of_life_app;
   GRANT USAGE ON SCHEMA public TO way_of_life_app;
   ```
   Роль нужна **до** миграций: миграция выдаёт права, только если роль существует.
   Сменить пароль позже: `ALTER ROLE way_of_life_app PASSWORD '<новый>';`
4. **Connect** → роль `neondb_owner`, **pooling OFF** → **ADMIN URL** (хост без
   `-pooler`): миграции, создание пользователя, бэкапы, секрет GitHub.
5. **Connect** → **pooling ON** → взять URL `neondb_owner` и заменить
   `neondb_owner:<пароль>` на `way_of_life_app:<пароль>` → **APP URL** (хост с `-pooler`,
   параметры `?sslmode=require…` оставить).

## 2. Миграции и аккаунт в production (с Mac)

В своём терминале, в папке проекта:

```bash
read -rs "DATABASE_ADMIN_URL?ADMIN URL: " && export DATABASE_ADMIN_URL && echo
```

```bash
pnpm db:migrate
```

Ожидается `apply 0001_initial.sql`. Свой аккаунт (пароль ≥ 12 символов, скрипт спросит):

```bash
pnpm db:create-user <почта>
```

```bash
unset DATABASE_ADMIN_URL
```

## 3. Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → доступ к
   `paraslov/my-life-style` → Import.
2. Project Name `way-of-life`, Framework Next.js, Root `./`. Build/Install Command не
   трогать — их задаёт `vercel.json`.
3. **Environment Variables**, только Production:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | APP URL из шага 1.5 |
   | `AUTH_THROTTLE_SECRET` | вывод `openssl rand -base64 32` |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` |

   `DATABASE_ADMIN_URL` в Vercel **не добавлять**.
4. Deploy. Результат первого деплоя при импорте неважен: боевые релизы идут из GitHub
   Actions (`vercel.json` отключает авто-деплой `main`).
5. **Settings → Build and Deployment → Node.js Version: 24.x**.
6. Для GitHub:
   - **VERCEL_PROJECT_ID** — Settings → General → Project ID;
   - **VERCEL_ORG_ID** — Account Settings → General → Vercel ID (для команды — Team ID);
   - **VERCEL_TOKEN** — Account Settings → Tokens → Create. Когда токен истечёт, релизы
     упадут — перевыпустить и обновить секрет.

## 4. GitHub

1. `paraslov/my-life-style` → **Settings → Environments → New environment** → `production`.
2. **Deployment branches** → Selected branches → `main`.
3. **Environment secrets**: `DATABASE_ADMIN_URL` (ADMIN URL), `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
4. **Actions → CI → Run workflow → main**. Проходят *Lint, types, tests and build* →
   *Migrations and database isolation* → *Migrate and deploy production*.

## 5. Проверка

1. Production-URL — Vercel → проект → Domains.
2. Без входа любая страница ведёт на `/login`; вход своим аккаунтом.
3. Настройки: изменить вес → «Сохранено» → обновить страницу → значение на месте.
4. «Скачать JSON» отдаёт файл; выход → снова требует вход.
5. Vercel → Logs: после сохранения настроек только строки вида `POST /settings 200`,
   без значений здоровья.
6. Первый бэкап — [backups.md](./backups.md):
   ```bash
   read -rs "BACKUP_DATABASE_URL?ADMIN URL: " && export BACKUP_DATABASE_URL && echo
   ```
   ```bash
   pnpm db:backup
   ```

## Если что-то упало

| Где | Симптом | Что делать |
|---|---|---|
| CI, Migrate and deploy | `Missing production secret: X` | Добавить секрет в окружение `production`, Run workflow |
| CI, Migrate and deploy | `main has changed` | Запустить CI на последнем коммите `main` |
| Сайт, 500 | `must use a NOSUPERUSER/NOBYPASSRLS runtime role` | В Vercel `DATABASE_URL` указывает на `neondb_owner` — заменить на APP URL |
| Сайт, 500 | `permission denied for table` | Роль создана после миграций — выполнить в SQL Editor блок `DO $$ … $$` из `migrations/0001_initial.sql` |
| Вход | «Неверная почта или пароль» | Повторить `pnpm db:create-user` с ADMIN URL — он сбрасывает пароль |
| Бэкап | `server version mismatch` | Образ `pg_dump` в `scripts/backup.mjs` старше сервера — поднять мажорную версию |
| Бэкап | `query would be affected by row-level security policy` | Роль бэкапа без `BYPASSRLS` — использовать `neondb_owner` или отдельную роль с `BYPASSRLS` |
