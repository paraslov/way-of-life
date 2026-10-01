# Way of Life — master plan

A personal healthspan system — an "operating system for a 40 → 80 way of life". Not a fitness
tracker, not a medical record and not a plan reader, but a **daily decision tool**: in ≤ 60 s
each morning, see whether this week adds energy or drains it, and what is sensible to do
today. Sometimes the best action of the day is not a workout but sleep, a walk, or adding
nothing at all.

The main goal is **function now and at 80**: 4 flights of stairs, lift 15 kg, get up from the
floor, an uneven trail, a clear head, my people. Garmin, lab tests and fitness tests are
dashboard sensors, not the goal itself.

Last updated: 01.10.2026

---

## Model (philosophy v1)

Full version with reasoning: [concept-plan.md](./concept-plan.md), frozen on 30.09.2026 (D22).
Revised only from real-usage data. How the docs line up with it:
[concept-review-status.md](./concept-review-status.md).

```text
Main goal: function now and at 80
  → Three axes: what we observe — Capacity / Vitality / Risk
    → Main bottleneck: what we do now (1 build focus + ≤ 1 protect item)
      → minimum / target / optional: how much we do
```

- **Capacity** — what I can do: VO₂max, strength, power, balance, mobility, cognitive reserve.
- **Vitality** — how life feels right now: sleep, energy, recovery, current symptoms.
- **Risk** — what can take the reserve away: blood pressure, ApoB, HbA1c, waist, steatosis,
  injuries, vision and hearing.

Every metric has one primary axis: a current symptom → Vitality, a structural or long-term
process → Risk. Build/Protect, the three horizons and the stress budget are lenses inside the
model, not separate models.

### Principles

1. **Function > Metrics.** Metrics are instruments, function is the goal.
2. **Capacity + Vitality + Risk.** The reserve is built (raise the ceiling) and protected (slow the decline, stay above the independence threshold).
3. **Leverage first.** The main bottleneck is the lever with the biggest return, not the worst metric; it changes at most once a month.
4. **minimum / target / optional.** The program survives bad weeks; more is not automatically better.
5. **Life breaks weeks.** Illness, travel, flare-ups and injuries each have a return protocol.
6. **Health should enable life.** Measure only what changes a decision on at least one horizon: day · decade · 80.
7. **Signal ≠ diagnosis, day ≠ trend.** No data is `UNKNOWN`, not "bad".
8. **The right reference point.** Wearable signals against the personal baseline; risk markers against clinical references and one's own trend (D23).
9. **One observation — one canonical store and one primary axis.**
10. **A recommendation is a suggestion.** The user decides.

### Not building

Without a strong reason: a health/readiness score, biological age, longevity probability,
dozens of daily metrics, an AI doctor or an intrusive AI coach, EAV or a universal ontology,
a correlation engine on a few weeks of data, social/happiness scores, automatic volume
increases, ACT inside Way of Life.

---

## Stage status

> The truth about progress is the checklists in the stage plans. This table summarises them
> and is updated when a stage changes status.
> ⬜ not started · 🟡 in progress · ✅ done · ⏸ postponed · 🚧 waiting for the gate

| # | Stage | Version | Plan | Status | Depends on |
|---|---|---|---|---|---|
| 00 | Content v6: concepts and defaults | V0 | [00-content-v6](./plans/00-content-v6.md) | 🟡 | — |
| 01 | Scaffold from ACT + privacy | V0.1 | [01-infrastructure](./plans/01-infrastructure.md) | ✅ | — |
| 02 | **Today: check-in → traffic light → decision + simple week** | V0.2 | [02-today](./plans/02-today.md) | 🟡 | 00 (defaults), 01 |
| — | **Gate: 2–3 weeks of own use** | — | [below](#gate-after-v02) | 🚧 | 02 |
| 02b | Today and Journal design + evening entry | V0.2.1 | [02b-day-journal-design](./plans/02b-day-journal-design.md) | 🟡 | 02 |
| 03 | **Activities: what to do, how to do it, progress** | V0.3 | [03-strength](./plans/03-strength.md) | ⬜ | gate |
| 04 | Metrics, Energy KPI, Horizon 80 | V0.4 | [04-metrics-horizon](./plans/04-metrics-horizon.md) | ⬜ | gate |
| 05 | Week, modes, deload, Weekly Review | V0.5 | [05-week-review](./plans/05-week-review.md) | 🟡 | 02b, 03 for quality |
| 06 | Medicine: check-ups, lab results | V0.6 | [06-medical](./plans/06-medical.md) | ⬜ | 04 (registry) |
| 07 | Reference: plan v6 inside the app | V0.7 | [07-reference](./plans/07-reference.md) | ⬜ | 00 |
| 08 | N=1 experiments | V0.8 | [08-experiments](./plans/08-experiments.md) | ⬜ | 04, 05 |
| 09 | Garmin import (optional): one activity file → benchmark session | V0.9 | [09-garmin-import](./plans/09-garmin-import.md) | ⬜ | 03 |

Stages 00 and 01 run in parallel. The part of stage 00 that blocks code is only the concepts
and defaults (00.1–00.4), and it is done: [content/defaults.md](./content/defaults.md),
[content/rules-v1.md](./content/rules-v1.md). Reference texts are written in parallel.

### Gate after V0.2

The user allowed the received 02b design and the week screen from 05 to ship before ~14 real
days of check-ins (D20). The gate itself is not passed: before changing the rules or building
the remaining stages 03–09, we check the implementation against real use. The answers go to
[02-today → Итоги использования](./plans/02-today.md#итоги-использования):

- is the check-in really ≤ 60 s? Which fields are skipped most often?
- is entering HRV by hand acceptable, is Sleep Score needed?
- do morning energy 1–10 and evening calm work, do they change any decisions?
- is the final traffic light useful, how often is `chosen ≠ recommended` and **why**?
- does Today help make a decision or only show information?
- is a "load outside training: normal / high" flag needed, does it change the decision?
- how many days went to illness, travel, a flare-up or the knee; what was missing on return?

The gate is not skipped for documentation work: its answers matter more than any framework.
Plans 03–09 are finalised with those answers. A changed plan gets an entry in its change log.

---

## Documents

> Docs are being moved to English gradually (D28). The core is English: this file,
> [architecture.md](./architecture.md), [content/](./content/), the [plan template](./plans/_template.md)
> and `CLAUDE.md`. Stage plans and other docs stay Russian until their next substantive
> revision (for 03–09 — the post-gate review): translation-only commit first, then the
> content change. `concept-text.md` and the frozen `concept-plan.md` stay Russian for now.

| Document | Contents |
|---|---|
| [concept-plan.md](./concept-plan.md) | Philosophy v1 (frozen): model, principles, architectural requirements for stages |
| [concept-review-status.md](./concept-review-status.md) | Docs vs philosophy v1: status of every point and what is left |
| [concept-text.md](./concept-text.md) | Extended discussion of the concept — background for concept-plan, not a source of rules |
| [content/](./content/) | Defaults (settings, starting data, targets, symptoms) and traffic-light rules — the source of numbers for code |
| [first-deploy.md](./first-deploy.md) | Step-by-step first deploy: Neon, Vercel, GitHub, checks |
| [backups.md](./backups.md) | Backups to the user's own machine and restore |
| [architecture.md](./architecture.md) | Cross-cutting concepts: 3 layers, metric registry, provenance, baseline, traffic light, units/time, targets, symptoms, privacy, benchmark sessions |
| [plans/](./plans/) | One plan per stage: checklist, steps, Claude Design request, change log |
| [design/design_handoff_today_week_journal/](./design/design_handoff_today_week_journal/) | "Today · Week · Journal" handoff; visual reference for 02b and 05 |
| [plans/_template.md](./plans/_template.md) | Template for a new stage plan |
| Content v5 | [Artifact «Образ жизни 40 → 80»](https://claude.ai/artifact/8CsPWre4L1bnmqi4QPBj2G) |
| Scaffold | `../ACT` — source of infrastructure and components |

---

## Working with plans

### Session start

1. Read this file: stage status and the decision log.
2. Open the current stage plan and find the **first unchecked step** in its checklist.
3. Before coding, read the plan's goal and scope sections and the relevant sections of
   [architecture.md](./architecture.md).

### While working

- **One step — one commit**, message `WOL-<stage>.<step> (feat|fix|docs): …`,
  e.g. `WOL-02.3 (feat): baseline engine`.
- Step done → **check it `[x]` in the plan checklist in the same commit**. A partly done step
  is not checked; add `↳ left: …` under it.
- Implementation diverged from the plan → fix the plan text and add a row to its change log
  (date, what, why). A plan describes what is and will be, not the original intent.
- A decision affects several stages or the architecture → update
  [architecture.md](./architecture.md) and add an entry to the [decision log](#decision-log) below.
- A new idea not needed for the current step → [backlog](#backlog), not the current checklist.

### Changing stage status

- First step taken → 🟡 in the table above.
- All steps checked and the plan's verification section passed → ✅, date in the plan's change log.
- After each finished stage, review the checklists of the **next** stages: what is outdated,
  what became clear. This is not bureaucracy; it is why plans stay true.

### Claude Design requests

- Every plan has a Claude Design request section saying **when** to send it.
- The handoff is already received and, per D20, is implemented in 02b and part of 05 before
  the gate; the scope and criteria of the original V0.2 do not change.
- For new requests after the gate, use the implemented Today, Week and Journal as visual
  context. First check the request against the 02 usage results and the current state of the
  stage; a handoff is a reference, not a source of rules or sample data.
- After the gate, send requests as needed. Put the handoff in `docs/design/<stage>/` and add
  a "move the design over from the handoff" step to the plan.
- Source hierarchy: stage plan → architecture.md → implemented screens → handoff as visual
  reference → `globals.css` tokens.

### New stage

Copy [plans/_template.md](./plans/_template.md), add a row to the status table and a
decision-log entry if the stage changes the architecture. Fill in the template's "Link to the
model" section before the steps: if the stage changes no decision on any horizon, reconsider
its scope.

---

## Decision log

| # | Date | Decision | Why |
|---|---|---|---|
| D1 | 28.09.2026 | A separate `Way of Life` repository, not a section of ACT | Different centres of gravity: ACT is behaviour and reflection, Way of Life is physiology → state → decision → reserve |
| D2 | 28.09.2026 | Copy ACT infrastructure, remove the ACT domain. A shared `packages/{auth,db,ui}` only with a third app | Don't build shared architecture before real reuse |
| D3 | 28.09.2026 | UI in Russian only, keep the next-intl infrastructure | One user; a message catalogue is a convenient structure |
| D4 | 28.09.2026 | Until the gate — ACT components without a design project; Claude Design after 2–3 weeks of use | The bottleneck now is not looks but which screens really matter |
| D5 | 28.09.2026 | Vertical slice V0.2 before everything else, then the gate | Check ≤ 60 s and traffic-light usefulness on live data |
| D6 | 28.09.2026 | Observation → interpretation → decision; a decision is stored with `rule_version` and `snapshot` | Rules will change, history must not lie |
| D7 | 28.09.2026 | Traffic light with `UNKNOWN`, no overall score, by the worst signal | More honest and explainable |
| D8 | 28.09.2026 | Metric registry in code + typed tables + one `measurements` table; no EAV | Flexibility without the EAV nightmare |
| D9 | 28.09.2026 | Mode is a `mode` field; a Plans/Protocols entity is postponed | While modes don't change the template, a separate entity is premature |
| D10 | 28.09.2026 | Reference content as repo files (MDX/TS) with frontmatter links (`metrics`, `functions`), not a `knowledge_articles` table | One author, content versioned in git; links give the same references for the System Map |
| D11 | 28.09.2026 | Symptoms are a separate entity (definitions + entries) | Don't bloat the check-in with columns |
| D12 | 28.09.2026 | Energy is a metric of its own: morning required, daytime optional (after the gate) | Directly answers the original "energy" goal |
| D13 | 28.09.2026 | LTHR = 165, zones recalculated: Z2 140–151, Z4 158–165 | User's answer; the 21.10 test will refine it |
| D14 | 28.09.2026 | Starting RHR baseline = 48, thresholds from it (≤ 51 / 52–54 / ≥ 55 two days); absolute ≤ 54 from v5 dropped | Real median is 48: the old thresholds would miss +6 |
| D15 | 28.09.2026 | Palpitations at rest — a yellow signal "no intensity today" + a symptom for correlation with sleep and illness; added a "signs of illness" symptom → red | Palpitations relate to short sleep, illness and stress, not to load |
| D16 | 28.09.2026 | The project is called **Way of Life** (`way-of-life`, DB and roles `way_of_life*`, commits `WOL-…`) | User's decision; Vercel project `way-of-life` |
| D17 | 28.09.2026 | Backups: Neon PITR + `pnpm db:backup` to the user's machine (`~/way_of_life/backups`), no cloud storage for dumps | Health data is not copied to third-party services |
| D18 | 28.09.2026 | Production DB is a separate Neon project (not a DB inside the ACT project); PostgreSQL 18 locally, in CI and in Neon | Isolation of medical data; one major version for dumps (Neon created the project on 18) |
| D19 | 29.09.2026 | The "Today · Week · Journal" handoff, received earlier than D4 planned, is implemented after V0.2 is checked: Today and Journal in 02b, Week in 05 | The design adds evening data and 05 features; don't delay the gate and keep business rules owned by the plans |
| D20 | 29.09.2026 | At the user's direct request, implement the 02b design and the Week screen from 05 now; the usage gate stays open, the rest of 05 and stages 03–09 are assessed after it | The design is ready and the user chose early implementation; a visual handoff does not change traffic-light rules or targets |
| D21 | 30.09.2026 | Stage 03 is a single Activities screen with running, strength, movement and walking/trekking tabs; a quick manual summary now, Garmin import in 09; progress in function and regularity matters more than sports results | The user needs "what/how to do" guidance and a long-term picture of movement without a Garmin copy |
| D22 | 30.09.2026 | Philosophy v1 frozen ([concept-plan.md](./concept-plan.md)): one hierarchy "function → Capacity/Vitality/Risk → main bottleneck → minimum/target/optional", 10 principles. Each metric has one primary axis (`axis` in the registry). Doses are `minimum / target / optional`; the word floor is not used | Two rounds of discussion produced the model; from here we learn from use, not from new frameworks |
| D23 | 30.09.2026 | The reference point depends on the metric type: wearable signals — personal baseline; risk markers (blood pressure, lipids, HbA1c, waist) — clinical references and one's own trend. Law 1 in architecture.md refined | "Compare with yourself" is misleading for ApoB or blood pressure |
| D24 | 30.09.2026 | Garmin is optional. Everything is entered by hand; sleep, RHR and HRV are optional and not necessarily daily. Import reads one activity file, extracts the values and does not keep the file. The main import scenario is benchmark sessions (recovery/easy/tempo/threshold/4×4, hikes) to compare pace and heart rate over time (architecture §4, §11) | User's decision; progress shows in a repeatable protocol, not in a daily Garmin copy |
| D25 | 30.09.2026 | The day decision is final at the end of the local day: until then the check-in and the choice can change, the evening entry records how the day ended; past days are not recomputed (architecture §2) | User's decision: judge in the evening, when it is clear how the day went |
| D26 | 30.09.2026 | Energy is a 1–10 scale, like RPE (1–5 answers multiplied by 2, `RULES_VERSION` 1.1). In the evening — "calm over the day": «сильно раздражался / раздражителен / норма / спокоен / позитивен». Both are shown and not part of the traffic light | User's request: 1–5 was too coarse; mental state is part of Vitality |
| D27 | 30.09.2026 | A missed or incomplete day can be filled in for 7 days: a dialog from Journal and Week (morning, activities, evening). That day's decision is not recomputed or created; Journal shows a current-rules verdict marked «заполнено позже» (architecture §2) | User's request: a missed day should not stay a hole forever; decision history is still not rewritten |
| D28 | 01.10.2026 | Docs, code comments and commits are in English; the UI stays Russian (D3) and literal UI strings are quoted in Russian; the assistant talks to the user in Russian. Translation is gradual: core docs now, the rest at their next substantive revision (rules in `CLAUDE.md`) | Russian text costs noticeably more tokens in every session; a gradual move avoids a huge diff and mixing language with meaning changes |

---

## Backlog

Ideas without a stage. When planning a stage, move the relevant items into its plan.

- Medical documents (MRI, ultrasound, ECG, Holter) linked to check-ups and lab results — private storage
- System Map link graph: article ↔ metric ↔ workout ↔ function at 80
- A Plans/Protocols entity (winter, race preparation) if mode periods with return protocols are not enough
- Garmin daily-metric import (sleep, RHR, HRV) — only if the gate shows manual entry is the main irritant (D24)
- Daytime energy mark at 14:00 (push/reminder)
- Shared infrastructure package with ACT (with a third app)
- Automatic main bottleneck — only once there is enough history; until then manually in the Weekly Review
- Soft link "Horizon function → ACT value"
- MFA: passkey or TOTP
- Periodic backup restore test into a clean DB (first one passed on 28.09.2026, [backups.md](./backups.md))

---

## Open questions

- [x] LTHR → **165** (D13), refine with the 21.10 test
- [x] Sleep over 4 weeks → 6:55 average, Score 84, RHR 48 ([defaults.md](./content/defaults.md))
- [x] Steps on a work day → 8–12 k
- [x] Palpitations → rare, at rest, with illness, short sleep or stress; not related to load (D15)
- [ ] HRV: status and average nightly HRV over 4 weeks
- [ ] Bedtime and wake time (not blocking)
- [ ] Hours at the computer per day (not blocking)
