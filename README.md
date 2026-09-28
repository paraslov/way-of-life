# Way of Life

Личная «операционная система образа жизни 40 → 80»: утренний чек-ин → светофор →
решение на день, неделя против targets, тренды относительно себя.

План и статус: [docs/way-of-life-plan.md](docs/way-of-life-plan.md). Архитектура:
[docs/architecture.md](docs/architecture.md).

## Стек

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui · PostgreSQL с RLS ·
Vercel. Инфраструктура (сессии, throttle входа, роли БД, миграции) перенесена из `../ACT`.

## Локальный запуск

Node 24.15.0 (`.tool-versions` для asdf, `.node-version` для CI) и pnpm из `packageManager`.

1. `pnpm install`
2. `cp .env.example .env.local`
3. `pnpm db:up` — PostgreSQL 18 на `127.0.0.1:5435`
4. `pnpm db:migrate`
5. `pnpm db:create-user you@example.com` — регистрации в приложении нет
6. `pnpm dev`

`pnpm db:down` останавливает контейнер и сохраняет том с данными.

Бэкапы на свою машину: `pnpm db:backup` — см. [docs/backups.md](docs/backups.md).

### Роли БД

- `way_of_life_admin` владеет схемой; используется только CLI-миграциями и созданием
  пользователя через `DATABASE_ADMIN_URL`.
- `way_of_life_app` — runtime-роль `NOSUPERUSER`/`NOBYPASSRLS` для Next.js (`DATABASE_URL`).
  Приложение при первом подключении проверяет роль и падает, если она обходит RLS.

### Роли в production

Перед первой миграцией создать runtime-роль в production-базе:

```sql
CREATE ROLE way_of_life_app
  LOGIN PASSWORD '<generated-runtime-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE <database_name> TO way_of_life_app;
GRANT USAGE ON SCHEMA public TO way_of_life_app;
```

Миграции выдают ей точные права. В Vercel задаётся только pooled URL этой роли
(`DATABASE_URL`) и `AUTH_THROTTLE_SECRET`; `DATABASE_ADMIN_URL` в runtime не попадает.
Подробности — [docs/deployment.md](docs/deployment.md).

## Проверки

- `pnpm check` — biome, типы, юнит-тесты
- `pnpm test:db` — миграции и изоляция RLS на одноразовой БД
  (`DATABASE_ADMIN_URL` и `DATABASE_URL` задаются явно, `.env.local` не читается)
- `pnpm build`

## Приватность

Здесь медицинские данные. Правила — [architecture §10](docs/architecture.md#10-приватность-и-безопасность):
никаких `console.*` в `src/` (только `src/lib/log.ts` с белым списком полей), никаких
analytics SDK, значения здоровья не попадают в URL и логи.
