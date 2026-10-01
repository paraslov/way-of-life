# Way of Life

Before any work, read [docs/way-of-life-plan.md](docs/way-of-life-plan.md): the stage status
table, "Working with plans" and the decision log. Then open the current stage plan in
`docs/plans/` and start from the first unchecked step of its checklist.

- Cross-cutting concepts: [docs/architecture.md](docs/architecture.md).
- Step done → check it `[x]` in the plan in the same commit (`WOL-<stage>.<step> (feat): …`).
- Diverged from the plan → fix the plan and add a row to its change log.
- Infrastructure and components come from `../ACT`.
- Never log health data (architecture §10).

## Language

- Write docs (`docs/`, `CLAUDE.md`), code comments and commit messages in English.
- The UI is Russian only (`src/i18n/messages/ru.json`, D3). Quote literal UI strings in
  Russian, e.g. «Отдых», «Дописать день».
- Talk to the user in English.
- Translation is gradual (D28): the core docs are English; any other Russian doc is
  translated when it is next substantively revised — first a translation-only commit,
  then the content change. Until then a Russian doc stays valid as is.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
