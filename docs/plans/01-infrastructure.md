# 01 — Каркас из ACT + приватность

**Версия:** V0.1 · **Статус:** ✅ · **Зависит от:** — · **Обновлён:** 28.09.2026
Мастер-план: [way-of-life-plan.md](../way-of-life-plan.md) · Архитектура: [architecture.md](../architecture.md)

## Чек-лист

- [x] **01.1** — `git init`, `.gitignore`, `.node-version`, `package.json` (name `way-of-life`), README
- [x] **01.2** — Скопировать инфраструктуру ACT (auth, db, migrate, скрипты, biome, vitest, CI)
- [x] **01.3** — Удалить ACT-домен, регистрацию, инвайты и админку; из миграций оставить только 0001–0002
- [x] **01.4** — Docker Postgres на порту 5435, роли `way_of_life_admin` / `way_of_life_app`, `.env.example`
- [x] **01.5** — Оболочка: сайдбар с разделами Way of Life (пустые страницы-заглушки), тема, только RU
- [x] **01.6** — Токены: светофор (green/yellow/red/unknown) + акценты плана (pine/clay/slate/gold)
- [x] **01.7** — `user_settings`: timezone (Asia/Almaty), LTHR, HRmax, вес, белок
- [x] **01.8** — Приватность: логгер с whitelist, CI-проверка `console.*`, security headers
- [x] **01.9** — Экспорт всех данных (JSON) и удаление всех данных — каркас в настройках
- [x] **01.10** — Деплой: GitHub repo, Vercel, Neon (prod), workflow миграций, бэкапы ([first-deploy.md](../first-deploy.md))
- [x] **01.V** — Проверка

---

## Цель

Пустое, но боевое приложение: вход, сайдбар, настройки, RLS, деплой. Предметной логики нет.

**Критерий готовности:** можно войти на prod-URL, открыть все разделы-заглушки и сохранить
настройки. `pnpm check` и `pnpm test:db` зелёные.

## Скоуп

**Входит:** инфраструктура, оболочка, токены, настройки, базовая приватность.
**Не входит:** предметные таблицы (→ 02 и далее), общий пакет с ACT (→ бэклог, D2).

## Шаги

### 01.2 — Что копировать из `../ACT`

| Берём | Не берём |
|---|---|
| `src/auth/*`, `src/lib/db/*`, `src/actions/auth.ts`, `src/actions/settings.ts` | `src/lib/act/*`, `src/lib/reference/*` |
| `src/components/ui/*`, `theme-*`, `timezone-switcher`, `use-saved-flash`, `app-sidebar` (переписать пункты) | `episodes/`, `scripts/`, `values/`, `journal/`, `progress/`, `today/`, `reference/` |
| `src/i18n/*` (оставить только `ru.json`, default `ru`) | `locale-switcher` |
| `scripts/migrate.mjs`, `create-user.mjs`, `scripts/lib` | `create-invite`, `set-admin`, `register/` |
| `migrations/0001`, `0002` (переименовать роли) | `0003`–`0009` |
| `biome.json`, `vitest*.config.ts`, `tsconfig.json`, `.github/workflows`, `docker-compose.yml`, `docs/deployment.md` | `.next`, `node_modules`, `.pnpm-store`, `tsconfig.tsbuildinfo`, `.env.local` |

После копирования: `grep -ri "act" src scripts migrations` → переименовать всё оставшееся.

### 01.6 — Токены

Оболочку, радиусы и шрифты берём из ACT. Добавляем семантику:
`--signal-green`, `--signal-yellow`, `--signal-red`, `--signal-unknown` + `-tint` и `-border`
для светлой и тёмной темы. Цвет никогда не единственный канал: у каждого сигнала есть
подпись и иконка.

### 01.8 — Приватность

По [architecture §10](../architecture.md#10-приватность-и-безопасность): `src/lib/log.ts`
с whitelist полей; biome-правило или CI-grep против `console.` в `src/`; headers
(`X-Frame-Options`, `Referrer-Policy`, CSP по возможности); никаких analytics.

### 01.10 — Бэкапы

Neon PITR + `pnpm db:backup` на машину пользователя (D17, [backups.md](../backups.md)).
Автозапуск по расписанию (launchd) — по желанию, пока вручную.

## Проверка

- [x] `pnpm check`, `pnpm test:db`, `pnpm build` зелёные (локально)
- [x] Runtime-роль не суперпользователь и без `BYPASSRLS` (проверка ACT на первом подключении + `tests/db/isolation`)
- [x] Локально: вход, настройки сохраняются, зоны пересчитываются, экспорт, удаление, 375 px
- [x] Prod: CI (тесты → миграции → деплой) зелёный, вход работает (пользователь, 28.09.2026)
- [x] Prod: бэкап `pnpm db:backup` снят и проверен `pg_restore --list`; владелец Neon обходит RLS — отдельная роль для бэкапов не нужна
- [ ] В логах Vercel нет тел запросов — проверить пользователю (Vercel → Logs после сохранения настроек)

## Запрос в Claude Design

**Не нужен.** Используем оболочку и компоненты ACT (D4).

## Открытые вопросы

- [x] Домен/имя проекта на Vercel → `way-of-life` (D16)
- [x] Бэкапы → локально на машину пользователя (D17)

## Журнал изменений

| Дата | Что | Почему |
|---|---|---|
| 28.09.2026 | План создан | Разбивка мастер-плана |
| 28.09.2026 | 01.2–01.9 одним коммитом | При выборочном переносе шаги неразделимы: логгер нужен throttle, токены — сайдбару, экспорт — настройкам |
| 28.09.2026 | `.tool-versions` (nodejs v24.15.0, pnpm 10.13.1) | В asdf Node 24 установлен как `v24.15.0`, `.node-version` его не выбирает |
| 28.09.2026 | Шрифт serif: Literata вместо Newsreader | У Newsreader нет кириллицы; Literata — serif страницы плана |
| 28.09.2026 | `user_settings` остаётся jsonb-мешком; схема и defaults — `src/lib/settings.ts`, битый ключ отбрасывается по одному | Так в ACT; отдельные колонки не нужны одному пользователю |
| 28.09.2026 | Guard-тест: каждая таблица с `user_id` обязана иметь FORCE RLS и быть в `USER_TABLES` теста; экспорт/удаление — по `USER_DATA_TABLES` | Новые таблицы этапа 02 не забудут RLS и экспорт |
| 28.09.2026 | CSP без script-src (только frame-ancestors/base-uri/form-action/object-src) | Строгий script-src требует nonce на каждый запрос — отдельная задача |
| 28.09.2026 | Минимальная длина пароля в `create-user` — 12 | Медицинские данные, MFA нет |
| 28.09.2026 | Переименование в Way of Life: пакет, БД и роли `way_of_life*`, cookie, мастер-план → `way-of-life-plan.md`, префикс коммитов `WOL-` | D16 |
| 28.09.2026 | Бэкапы — скрипт `pnpm db:backup` на машину пользователя вместо еженедельного дампа в облако; проверен дамп → восстановление | D17 |
| 28.09.2026 | PostgreSQL 16 → 17 в docker-compose и CI | Neon по умолчанию 17; клиент 17 даёт при восстановлении в 16 ошибку `transaction_timeout` |
| 28.09.2026 | PostgreSQL 17 → 18 в docker-compose, CI и образе бэкапа; том монтируется в `/var/lib/postgresql` | Neon создал проект на 18; `pg_dump` 17 отказывается снимать дамп с сервера 18. Образ 18 хранит данные в подпапке версии и не стартует со старым путём тома |
| 28.09.2026 | Регион `fra1` в `vercel.json`, Neon `aws-eu-central-1` | Ближайшая к Алматы пара; функции рядом с базой |
| 28.09.2026 | Этап завершён: prod работает, первый бэкап снят | — |
| 28.09.2026 | Локальный дев: порт 3200; превью-сервер приложения не видит `~/Desktop` (TCC), `pnpm dev` запускать из терминала | Наблюдение при проверке |
