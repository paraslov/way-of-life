# Way of Life — architecture concepts

A shared reference for all stage plans. If a stage plan contradicts this document, this
document wins until the [decision log](./way-of-life-plan.md#decision-log) says otherwise.
The product model and principles live in [master plan → Model](./way-of-life-plan.md#model-philosophy-v1)
and [concept-plan.md](./concept-plan.md); this document is about how they are implemented.

Last updated: 01.10.2026

---

## 1. Four laws

1. **The right reference point.** Wearable signals (sleep, RHR, HRV) are compared with the
   personal baseline; absolute numbers are only for the start. Risk markers (blood pressure,
   lipids, HbA1c, waist) are compared with clinical references and one's own trend (D23).
2. **Adherence > the perfect program.** Data entry must not become a second job.
3. **A decision, not a report.** Every screen answers "what do I do".
4. **Observations are kept forever, interpretations may change.**

## 2. Three layers: observation → interpretation → decision

```text
OBSERVATION        INTERPRETATION             DECISION
sleep_minutes=342  → sleep: RED (rules v1)    → Threshold → easy run 35 min
rhr=57, base=52    → rhr: YELLOW              → chosen: "accept"
```

- **Observations** are raw facts in tables. Logic never overwrites them.
- **Interpretation** is pure functions in `src/lib/*` (signals, baseline, aggregates). Results
  are computed on read and not written to tables.
- **A decision** is written to `day_decisions` together with `rule_version` and `snapshot`
  (jsonb: inputs, baseline, signals). So later we can say: "on 28.09 the app recommended
  recovery under rules v1.3".
- Rules are versioned with the `RULES_VERSION` constant in code. When rules change, past
  decisions stay as they are, while charts are recomputed under the new rules.
- **Missing data is not an observation.** An empty field is stored as `NULL` and gives
  `UNKNOWN`, not zero, "bad" or rest. Derived values can always be recomputed from observations.

### Day decision lifecycle (D25)

- **The day is open** (today in the user's time zone). Saving the morning check-in recomputes
  the traffic light and the recommendation in the same transaction. A changed recommendation
  clears the choice: it answered a different question. The choice can change all day.
- **Evening.** The evening entry records how the day ended: activities, how the decision
  felt, calm. It does not change `day_decisions`.
- **End of the local day** — the decision is final; the journal shows the saved `snapshot`.
- **Filling in a past day** (D27) is possible for 7 days: a dialog opens from Journal or Week
  with the morning, activities and evening. Observations are written to that day's date;
  `day_decisions` are not recomputed and are not created after the fact. That morning's red
  flags are not changed (they are for acting "now"). A morning entered after its day ended is
  marked with `daily_checkins.late_edited_at`. Journal shows a current-rules verdict: for a day
  without a decision — in place of the decision («заполнено позже»), for a day with a
  decision — next to it. Older than 7 days — read only.

## 3. Metric registry

Metric metadata lives **in code** (`src/lib/metrics/registry.ts`), not in a database table.
No EAV for everything.

```ts
{ key: "sleep.duration", name: "Сон", unit: "min", domain: "recovery",
  frequency: "daily", sources: ["manual", "garmin"],
  baseline: { strategy: "mean", windowDays: [7, 30] }, signal: sleepSignal }
```

- Domains: `recovery`, `aerobic`, `strength`, `mobility`, `body`, `medical`, `habits`, `subjective`.
- **Axis** (`capacity` | `vitality` | `risk`) — one primary axis per metric (D22): maximum
  capability → `capacity`, current state and symptoms → `vitality`, a structural or long-term
  process → `risk`. The domain groups storage and reference content, the axis drives
  interpretation and screens. Add the `axis` field to the registry in 04.1.
- **Typed tables** for frequent data (check-in, workouts, sets) and **one `measurements`
  table** for rare ones (tests, waist, VO₂max, blood pressure). Its rows reference a
  `metric_key` from the registry.
- Lab results live in a separate `lab_results` table: they have their own units and
  references (see §7).
- Evening observations — walks after meals, protein and fibre as ranges, bedtime, decision
  assessment, calm over the day — live in `day_evenings`, one row per day (02b, D26).
- Stage 03 shows all kinds of movement in Activities: a completed session stays one row in
  `activities`, exercise details reference it. The session variant is separate from the broad
  `type`; Today, Week, Journal and Activities read the same fact (D21).

## 4. Data provenance and deduplication

Every observation has a `source` (`manual` | `garmin` | `lab` | `test` | `cpet` | …), and when
needed also `method`, `device` and `note`.

- VO₂max estimated by Garmin and VO₂max from CPET are **different** observations of one metric.
- LTHR from Garmin auto-detection and LTHR from a 30-minute test differ by `method`.
- Manual entry is written with `source = 'manual'` from day one.

### Canonical storage (D24)

**The main path is manual entry.** Garmin is optional: import reads one activity file,
extracts the needed values and does not keep the file. Sleep, RHR and HRV are entered by hand
and not necessarily every day; importing them is not planned unless the gate shows manual
entry is the main irritant.

| Observation | Where it lives | Source |
|---|---|---|
| sleep, Sleep Score, RHR, HRV (ms and status) | `daily_checkins` | manual, optional |
| energy, desire to move, legs, steps, red flags | `daily_checkins` | manual |
| symptoms | `symptom_entries` | manual |
| evening: walks, protein, fibre, bedtime, decision assessment, calm | `day_evenings` | manual |
| completed activity, including a benchmark one (§11) | `activities` + 03 details | manual or a Garmin file |
| rare measurements: weight, waist, blood pressure, VO₂max, tests | `measurements` (04) | manual / garmin / cpet / test |
| lab results | `lab_results` (06) | lab |
| day decision | `day_decisions` | computed, final at the end of the day (§2) |

- Every observation has one place. Import does not create a second series: it creates or
  completes the same record after a preview.
- `daily_checkins` is one row per day; its `source` is always `manual`.
- For activities, `UNIQUE (user_id, source, external_id)` prevents importing the same file
  twice. `external_id` is the Garmin activity id or a file hash. If a manual record of the same
  kind already exists that day, import offers to complete it rather than create a second one;
  both are never counted by default.
- Raw file data is not kept: the user sees the extracted values, edits them in the preview,
  and what is saved becomes canonical. A separate `import_batch` entity is not needed while
  import is one activity at a time: rollback = deleting that activity.

## 5. Baseline engine

A separate `src/lib/baseline/` module of pure functions with unit tests.

```ts
baseline(series, { strategy: "median" | "mean", windowDays, minPoints, excludeToday })
  → { value, band: [low, high], n } | null
```

| Metric | Strategy |
|---|---|
| RHR | median, 28 days |
| HRV | median, 28 days, band — Garmin status if entered |
| Sleep | mean, 7 and 30 days |
| Energy | median, 14 days |

With fewer than `minPoints` points the function returns `null`. The signal then uses the
starting absolute thresholds from plan v6 and is labelled «по стартовым порогам».

- **Two quality levels:** starting (from `defaults`, while `n < minPoints`) and personal
  (`n ≥ minPoints`). The UI says honestly which one applies: «по стартовым порогам» or
  "median over 28 days, n = 23". No intermediate "provisional" level: `n` and the window
  already show how reliable the baseline is.
- **Sparse data is normal.** Sleep and HRV need not be entered every day: the window counts the
  available points; a gap is not a bad value and does not break the window.
- Baseline applies only to wearable signals and self-ratings. Risk markers are interpreted
  against clinical references and the trend (§1).

## 6. Traffic light

- The traffic light describes the **day's resource mode**, not permission to train:
  GREEN — a normal day, YELLOW — reduce optional load, RED — recovery comes first. Swapping a
  workout is the first use case. In V0.2 `recommended_action` is a training action, but the
  schema and code must not lock in "day action = workout": later it may be sleep, a walk or a
  medical task.
- States: **GREEN · YELLOW · RED · UNKNOWN**. No data means `UNKNOWN`, not a bad signal.
- The verdict is the worst **known** signal. One yellow among greens is not counted but is
  shown. If all signals are `UNKNOWN`, the verdict is `UNKNOWN` and the default plan applies.
- **No overall score** like "Readiness 83 %". Show the verdict, an explanation per signal and
  the action.
- Red flags (palpitations that don't pass when walking, chest pain, presyncope, breathlessness
  out of proportion to effort) sit **outside the traffic light**: they override any decision.
- **HRV — one interpretation.** In v1 the traffic-light signal is the Garmin status entered by
  hand (Garmin's interpretation, labelled as such). `hrv_ms` is stored as a raw observation but
  not interpreted in v1. An own signal from the `hrv_ms` baseline comes no earlier than the
  gate and with n ≥ 14. It then becomes primary and the Garmin status becomes context. They
  never both vote in the verdict.
- The day decision has two fields: `recommended_action` from the app and `chosen_action` from
  the user (`accept` | `keep_original` | `skip` | `custom`). This closes the N=1 learning loop.

## 7. Units, references, time

- **Units.** Every registry metric has a canonical unit and values are stored in it. Lab
  results are the exception: stored **as printed** (`value`, `unit`, `ref_low`, `ref_high`,
  `ref_text`, `lab`). There are no global "ALT norms".
- **Time.** `user_settings.timezone` defaults to `Asia/Almaty`. Daily entities use a
  `local_date date` key; events are stored as `timestamptz` (UTC). Sleep belongs to the wake-up
  date. "Today" is always computed in the user's time zone (ACT already has this pattern:
  `event_timezone`, `timezone-switcher`).

## 8. Configuration over hardcoding

- **Targets** live in the `targets` table: `metric_key`, `period` (`day` | `week`), `minimum`,
  `target_min`, `target_max`, `active_from`. Initial values come from plan v6. The Week screen
  aggregates targets automatically rather than being assembled by hand.
- **Dose semantics — `minimum / target / optional`** (D22). `minimum` is enough for a bad
  week, `target_min…target_max` is a good normal week, **optional** is everything above
  `target_max`. Optional is not a column: it is the rule "only when there is resource". Above
  target is shown neutrally, without praise, and is not recommended on a yellow or red day.
- **Generic and typed targets.** Scalar sums and averages (aerobic minutes, steps, sleep,
  protein, fibre, mobility sessions) are aggregated by the generic engine. Compound targets are
  computed by dedicated functions in `src/lib/week/`:
  - strength: minimum = 1 full + 1 Lite, target = 2 full; Lite does not replace a full session;
  - intensity: a cadence rule "once every 7–10 days", not a weekly target; after 7 days —
    «снова доступна», never "overdue";
  - power/balance: sessions × minimum duration;
  - rest days: explicit mark only (below).

  For now the code simplifies strength to minimum 1 and intensity to "1 per week"
  (`src/lib/seed.ts`). Replace when implementing 03/05.4. No universal DSL or EAV.
- **Rest ≠ missing data.** A rest day counts only from an explicit «Отдых» mark. A past day
  with no entries is "no data". Days of illness, travel, a flare-up or an injury are mode days
  (below): neither rest nor failure. A «Отдых» mark on a day with training does not count as rest.
- **Modes are periods, not a property of the week.** Today it is `week_modes` per week
  (`normal` | `deload` | `travel` | `illness`). The target is a period with start and end
  dates: `illness` (with a "had a fever" flag), `travel`, `flare` (GI flare-up), `injury`
  (what hurts), `deload`. During a period, missed targets are neutral and the mode's minimum
  applies, the recommendation accounts for the mode, and quality is not offered. After the
  period the **return protocol** from [rules-v1.md](./content/rules-v1.md#modes-and-return-protocols)
  applies. Protocol numbers live in content, not code. A Plans/Protocols entity is still not
  needed (D9): a period plus protocol rules cover the scenario.
- LTHR, zones, HRmax, weight and the protein target live in `user_settings`, not in code.
- **Settings that interpret history** (LTHR, HRmax, zones, starting RHR baseline) take effect
  from a date. The day decision keeps the values it needs in `snapshot` (e.g. the 151 heart-rate
  cap). When past activities start being shown in zones (03), settings get a history with
  `active_from`, and a past date is read with the value that applied then. A new LTHR does not
  rewrite old workouts. Raw values (average heart rate, pace) do not depend on settings.

## 9. Symptoms

No column per symptom.

- `symptom_definitions`: `key`, `name`, `scale` (0–10 | yes/no), `pinned`, `archived`.
- `symptom_entries`: `local_date`, `symptom_id`, `severity`, `context`, `note`.
- The check-in shows only pinned symptoms (knee, thigh, palpitations); others are added via
  «+ симптом». Seed data: knee, thigh (rectus femoris), palpitations (+ heart rate), reflux,
  abdomen, calf.

## 10. Privacy and security

This app stores medical data, so the requirements are stricter than in ACT.

- Single-user app: no sign-up or invites; the user is created via CLI.
- RLS on all user tables, a runtime role without `BYPASSRLS` (ACT pattern).
- **Never log health data.** No `console.log(checkin)`, only a logger with an allow-list of
  fields. CI checks for `console.*` in `src/`.
- No analytics/telemetry SDKs. No medical values in URLs or query strings.
- Secrets only on the server; cookies `Secure`, `HttpOnly`, `SameSite=Lax`; security headers.
- Backups: Neon PITR plus `pnpm db:backup` — a dump to the user's own machine in
  `~/way_of_life/backups` ([backups.md](./backups.md), D17). Dumps never go to the cloud.
- Export of all data (JSON and CSV) and deletion of all data are functions in settings.
- Medical documents (files) come later, only in private storage with signed URLs.

## 11. Benchmark sessions (D24)

Aerobic-reserve progress shows not in a single workout but in **repeatable benchmark
sessions** with the same protocol. Example: in September an easy 5 km run — pace 7:12, average
heart rate 138; in December the same protocol — 7:03 and 133. Pace is slightly faster and,
more importantly, heart rate dropped at the same load.

- A benchmark session is an ordinary `activities` row marked as benchmark, with a
  `protocol_key`: variant and conditions, e.g. `run.recovery.5k` (light, Z1), `run.easy.5k` (Z2),
  `run.tempo.*`, `run.threshold.*`, `run.4x4`, `hike.<route>`. The exact dictionary is in 03.1.
  There is no second workouts table.
- Fields: date, distance, time → pace, average heart rate; optionally max heart rate,
  elevation gain, RPE, conditions (heat, wind, terrain). For intervals and tempo segments —
  the values of the work segments: the average heart rate of a whole interval session says
  nothing about the quality of the segments.
- Entered by hand or from one Garmin activity file (09): the file is read in memory, the
  summary and laps are extracted, and the file itself is not kept.
- Comparison only within one `protocol_key`. Pace and heart rate are shown together. The main
  signal for easy running is heart rate at the same pace/effort, or pace at the same heart
  rate. If conditions differ noticeably, the comparison is shown with a caveat, not as progress.
- Axis — Capacity; Horizon functions — "4 flights without stopping" and "an uneven trail".
  No form score; raw values do not depend on LTHR (§8).
