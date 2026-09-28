# MyLife

Личная «операционная система образа жизни 40 → 80»: утренний чек-ин → светофор →
решение на день, неделя против targets, тренды относительно себя.

План и статус: [docs/mylife-plan.md](docs/mylife-plan.md). Архитектура:
[docs/architecture.md](docs/architecture.md).

## Стек

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui · PostgreSQL с RLS ·
Vercel. Инфраструктура (сессии, throttle входа, роли БД, миграции) перенесена из `../ACT`.

## Локальный запуск

Node 24.15.0 (`.tool-versions` для asdf, `.node-version` для CI) и pnpm из `packageManager`.

1. `pnpm install`
2. `cp .env.example .env.local`
3. `pnpm db:up` — PostgreSQL 16 на `127.0.0.1:5435`
4. `pnpm db:migrate`
5. `pnpm db:create-user you@example.com` — регистрации в приложении нет
6. `pnpm dev`

`pnpm db:down` останавливает контейнер и сохраняет том с данными.

### Роли БД

- `mylife_admin` владеет схемой; используется только CLI-миграциями и созданием
  пользователя через `DATABASE_ADMIN_URL`.
- `mylife_app` — runtime-роль `NOSUPERUSER`/`NOBYPASSRLS` для Next.js (`DATABASE_URL`).
  Приложение при первом подключении проверяет роль и падает, если она обходит RLS.

## Проверки

- `pnpm check` — biome, типы, юнит-тесты
- `pnpm test:db` — миграции и изоляция RLS на одноразовой БД
  (`DATABASE_ADMIN_URL` и `DATABASE_URL` задаются явно, `.env.local` не читается)
- `pnpm build`

## Приватность

Здесь медицинские данные. Правила — [architecture §10](docs/architecture.md#10-приватность-и-безопасность):
никаких `console.*` в `src/` (только `src/lib/log.ts` с белым списком полей), никаких
analytics SDK, значения здоровья не попадают в URL и логи.
