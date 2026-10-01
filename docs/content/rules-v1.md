# Traffic-light rules v1

`RULES_VERSION = "1.1"`. Implementation: `src/lib/light/` (stage 02). General principles are in
[architecture §5–6](../architecture.md#5-baseline-engine). Numbers come from [defaults.md](./defaults.md).
Updated: 30.09.2026

## Baseline

| Metric | Strategy | Starting value while n < 14 |
|---|---|---|
| RHR | median over 28 days, excluding today | 48 |
| Sleep | mean over 7 and over 30 days | 6:55 (for the KPI, not for the signal) |
| HRV | Garmin status | — |

## Signals

A value that is not entered gives an `UNKNOWN` signal.

| Signal | Green | Yellow | Red |
|---|---|---|---|
| **Sleep** (last night) | ≥ 7:00 | 6:00–6:59 | < 6:00 |
| **RHR** (from baseline B) | ≤ B + 3 | B + 4…6, or ≥ B + 7 for one day | ≥ B + 7 two days in a row |
| **HRV** (Garmin status) | Balanced | Unbalanced / Low 1–2 days | Low 3+ days or Poor |
| **Desire to move** | want to go out | neutral, sluggish | don't even want to get up |
| **Legs** | light | heavy | heavy 3+ days in a row |
| **Knee / thigh** | 0–1 | 2–3 | ≥ 4 or pain at rest |
| **Palpitations** (over the day) | no | yes (at rest) | — (see red flags) |
| **Signs of illness** | no | — | yes |

With the starting B = 48 the RHR thresholds are: ≤ 51 green · 52–54 yellow · ≥ 55 two days in a row red.

**Energy (1–10)**, like RPE, is shown but not part of the verdict. Revisit after the gate.
Since version 1.1 the scale is 1–10 (D26); 1–5 answers were multiplied by 2, and decision
snapshots of version 1.0 keep the old scale.

### Implementation notes (02.5)

- **1–3 scales.** Desire: 3 — want to go out, 2 — neutral, 1 — don't even want to get up.
  Legs: 3 — light, 2 — heavy, 1 — loaded; "heavy" = 1 or 2.
- **"In a row"** means consecutive calendar days: if yesterday has no data, the streak breaks.
- **Pain at rest** — the "at rest" mark with severity ≥ 2 (0–1 is green anyway).
- **Knee and thigh** are two separate signals.
- **RHR from the personal baseline:** the median may be fractional (48.5); the ≤ B + 3 boundary
  is compared as is.
- A metric or symptom not entered is `UNKNOWN`; an unselected yes/no symptom in a saved form is "no".

## Verdict

1. A red flag overrides everything (see below).
2. The verdict is the worst known signal.
3. One yellow with all other signals green → green verdict, with the note «учтено: …».
   At least one known green is required: if the only known signal is yellow, the verdict is yellow.
4. All signals `UNKNOWN` → verdict `UNKNOWN`, the default plan applies.

## Action

| Verdict | Intensity | Strength A/B | Easy run / trekking |
|---|---|---|---|
| Green | as planned | as planned | as planned |
| Yellow | → easy run 30–40 min, heart rate < 151 | → Lite | shorter, heart rate < 151 |
| Red | rest or a walk | rest or a walk | rest or a walk |
| UNKNOWN | as planned if feeling normal | as planned | as planned |

Palpitations during the day add a separate restriction: **no intensity today**, even with a
green verdict.

## Modes and return protocols

Draft per [architecture §8](../architecture.md#8-configuration-over-hardcoding); implemented in
05.2 after the gate. These are personal defaults, not medical rules: a doctor's advice comes first.

| Mode | During | Return |
|---|---|---|
| Illness with fever | no training, only daily life and a walk as feels right | 2–3 days walking only → Lite strength and easy runs → intensity no earlier than 7 days after the fever |
| Illness without fever | walking and Lite as feels right, no intensity | normal plan, intensity after 2 symptom-free days |
| Travel | minimum: walking + one short bodyweight strength session | normal plan from the next day |
| GI flare-up (reflux, pancreas) | no intensity; adapt food and meal timing | load returns once symptoms settle |
| Injury / knee | swaps without impact or jumps; strength for the rest of the body continues | impact load once pain is 0–1 and there is no pain at rest |

During a mode, missed targets are neutral and quality is not offered. The return protocol is
shown in the day decision as the reason, e.g. «после болезни: день 2 из 3 — только ходьба».

## Red flags (outside the traffic light)

Stop and see a doctor if:

- palpitations during exercise don't pass when walking;
- chest pain or pressure;
- presyncope;
- breathlessness out of proportion to effort.

## Default week template

Mon — strength A + power · Tue — easy run + strides · Wed — intensity (if ≥ 7 days since the
last one, otherwise an easy run) · Thu — strength B + power · Fri — active rest ·
Sat — trekking · Sun — rest.

## Check at the gate

- **Share of yellow nights.** In September ~13 of 28 nights were 6–7 h. With a 7:00 threshold
  sleep will be yellow almost every other day. Options: keep it (sleep is KPI #1, let it
  remind); use Garmin's "sleep need"; count as yellow only < 6:30 or two
  nights < 7:00 in a row.
- Is the RHR + 4 threshold too strict given an individual range of 44–50?

## Change log

| Date | Version | What |
|---|---|---|
| 28.09.2026 | 1.0 | Rules v1 |
| 30.09.2026 | 1.1 | Energy 1–10 instead of 1–5 (D26), still not part of the verdict. Added a draft of modes and return protocols |
