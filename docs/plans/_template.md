# NN — Stage name

**Version:** V0.N · **Status:** ⬜ · **Depends on:** … · **Updated:** DD.MM.YYYY
Master plan: [way-of-life-plan.md](../way-of-life-plan.md) · Architecture: [architecture.md](../architecture.md) · Model: [philosophy v1](../way-of-life-plan.md#model-philosophy-v1)

> A stage after the gate → before starting, check the plan against the [02 usage results](./02-today.md#итоги-использования).

## Checklist

> Check `[x]` in the same commit as the step. Commit: `WOL-NN.K (feat): …`.
> Partly done → don't check it, add `↳ left: …`.

- [ ] **NN.1** — …
- [ ] **NN.2** — …
- [ ] **NN.V** — Verification (see below)

---

## Goal

One or two sentences: what the user can **decide or do** after this stage.

**Done when:** a verifiable statement. No causal wording ("how X affects Y") unless the stage
does causal analysis.

## Link to the model

Fill in before the steps. If the stage changes no decision, reconsider its scope.

- **Axis:** Capacity / Vitality / Risk — what the stage helps see or change.
- **Decision and horizon:** which decision it changes — day, week/quarter, or decade/80.
- **Function at 80:** which Horizon function stands behind it (if any).
- **Temptations:** what from ["Not building"](../way-of-life-plan.md#not-building) tempts here and why we don't do it.

## Scope

**In:** …
**Out:** … (where it goes — stage / backlog)

## Data

Fill in if the stage adds or reads observations. Reference [architecture.md](../architecture.md)
rather than restating it.

- **Canonical storage:** where each new observation lives; no second series of the same thing.
- **Source and reference point:** `source`/`method`; personal baseline or clinical reference (D23).
- **Empty ≠ 0 ≠ rest:** how missing data is shown.
- **Week modes:** how the stage behaves during illness, travel, a flare-up, an injury.
- **History:** which settings and rules apply by date (`active_from`, `snapshot`); what is not
  recomputed after the fact.

## Steps

### NN.1 — …

What to do: files, tables, functions, tests.

## Verification

- [ ] `pnpm check` green
- [ ] Manual scenario: …
- [ ] Empty data, the first month and an illness/travel mode don't look like failure
- [ ] Light and dark theme, 375 px

## Claude Design request

**When to send:** …

Request text (a request **to** design, not a handoff **from** design):

- What is needed and why
- Source hierarchy: plan → architecture → implemented screens → handoff → tokens
- Non-negotiable constraints: by default — no score or readiness percentages; `UNKNOWN` is a
  neutral state; no data ≠ zero; colour is never the only channel; a recommendation is a
  suggestion; no streaks or gamification. Plus the stage's own constraints.
- Surfaces and states to draw

Before sending, check the request against the 02 usage results and the actual state of the screens.

## Open questions

- [ ] …

## Change log

| Date | What | Why |
|---|---|---|
| DD.MM.YYYY | Plan created | — |
