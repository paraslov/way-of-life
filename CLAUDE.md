# Way of Life

Перед любой работой прочитай [docs/way-of-life-plan.md](docs/way-of-life-plan.md): таблицу статусов этапов,
раздел «Как работать с планами» и журнал решений. Затем открой план текущего этапа в
`docs/plans/` и начни с первого неотмеченного шага в чек-листе.

- Сквозные концепции: [docs/architecture.md](docs/architecture.md).
- Закончил шаг — отметь `[x]` в плане в том же коммите (`WOL-<этап>.<шаг> (feat): …`).
- Разошёлся с планом — поправь план и добавь строку в его журнал изменений.
- Инфраструктура и компоненты взяты из `../ACT`.
- Не логировать данные о здоровье (architecture §10).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
