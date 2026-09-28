# 01 — Каркас из ACT + приватность

**Версия:** V0.1 · **Статус:** 🟡 · **Зависит от:** — · **Обновлён:** 28.09.2026
Мастер-план: [mylife-plan.md](../mylife-plan.md) · Архитектура: [architecture.md](../architecture.md)

## Чек-лист

- [x] **01.1** — `git init`, `.gitignore`, `.node-version`, `package.json` (name `mylife`), README
- [ ] **01.2** — Скопировать инфраструктуру ACT (auth, db, migrate, скрипты, biome, vitest, CI)
- [ ] **01.3** — Удалить ACT-домен, регистрацию, инвайты и админку; из миграций оставить только 0001–0002
- [ ] **01.4** — Docker Postgres на порту 5435, роли `mylife_admin` / `mylife_app`, `.env.example`
- [ ] **01.5** — Оболочка: сайдбар с разделами MyLife (пустые страницы-заглушки), тема, только RU
- [ ] **01.6** — Токены: светофор (green/yellow/red/unknown) + акценты плана (pine/clay/slate/gold)
- [ ] **01.7** — `user_settings`: timezone (Asia/Almaty), LTHR, HRmax, вес, белок
- [ ] **01.8** — Приватность: логгер с whitelist, CI-проверка `console.*`, security headers
- [ ] **01.9** — Экспорт всех данных (JSON) и удаление всех данных — каркас в настройках
- [ ] **01.10** — Деплой: GitHub repo, Vercel, Neon (prod), workflow миграций, бэкапы
- [ ] **01.V** — Проверка

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

Neon PITR + еженедельный `pg_dump` (GitHub Action с шифрованием или локальный скрипт).
Зафиксировать выбор в журнале изменений.

## Проверка

- [ ] `pnpm check`, `pnpm test:db`, `pnpm build` зелёные
- [ ] Runtime-роль не суперпользователь и без `BYPASSRLS` (проверка ACT на первом подключении)
- [ ] Prod: вход, настройки сохраняются, выход
- [ ] В логах Vercel нет тел запросов

## Запрос в Claude Design

**Не нужен.** Используем оболочку и компоненты ACT (D4).

## Открытые вопросы

- [ ] Домен/имя проекта на Vercel
- [ ] Бэкапы: GitHub Action или локально?

## Журнал изменений

| Дата | Что | Почему |
|---|---|---|
| 28.09.2026 | План создан | Разбивка мастер-плана |
