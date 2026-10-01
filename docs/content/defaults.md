# Defaults: settings, starting data, targets

The source of numbers for stage 02 and seed data. Traffic-light rules are in [rules-v1.md](./rules-v1.md).
Updated: 28.09.2026

## User settings (`user_settings`)

| Setting | Value | Source |
|---|---|---|
| Time zone | `Asia/Almaty` | — |
| LTHR | **165** | user, 28.09.2026; refine with the 21.10 test (`method: test_30min`) |
| HRmax | 184 | from the watch |
| Weight | ~85–88 kg | confirm by weighing |
| Protein | 120–140 g/day (1.4–1.6 g/kg) | plan v6 |

### Heart-rate zones from LTHR 165

Boundaries scaled proportionally from the v5 zones, where LTHR was 162.

| Zone | Heart rate | Used for |
|---|---|---|
| Z1 recovery | < 140 | cool-down, the day after trekking |
| Z2 aerobic base | 140–151 | easy run (**cap 151**), trekking |
| Z3 tempo | 152–157 | tempo finish |
| Z4 threshold | 158–165 | threshold segments, fartlek |
| Z5 above threshold | > 165 | 4×4 (> 165 by the end of a segment) |

Lite strength: heart rate < 130 (unchanged). The 27.09 race with an average of 148 is 90 % of
LTHR 165. Check that Garmin has LTHR 165 set and that its zones match this table.

## Starting Garmin data (01–28.09.2026)

Needed so the traffic light works from day one, before an own baseline history builds up.

| Metric | Value | Comment |
|---|---|---|
| Sleep, average | **6 h 55 min** | just under the 7 h minimum |
| Sleep need (Garmin) | 7 h 02 min | |
| Sleep Score, average | 84 | |
| Nights < 6 h | ~4 of 28 | 5:12 – 5:55 |
| Nights 6–7 h | ~13 of 28 | |
| Nights ≥ 7 h | ~11 of 28 | the second half of the month is noticeably better |
| RHR, average | **48** | range ~44–50 |
| Night-time heart rate, average | 52 | |
| Body Battery overnight | +62 | |
| SpO₂ / respiration / skin temperature | 97 % / 15 per min / 0° | candidate illness signals on import (09) |
| HRV | **no data** | open question |
| Bedtime and wake time | **no data** | not needed to start |
| Steps on a work day | 8,000–12,000 | the step target is already met |

## Targets (seed for the `targets` table)

| metric_key | period | minimum | target_min | target_max | unit |
|---|---|---|---|---|---|
| `aerobic.minutes` | week | 150 | 250 | 400 | min |
| `intensity.sessions` | 10 days | 0 | 1 | 1 | sessions |
| `strength.sessions` | week | 1 (+1 Lite) | 2 | 2 (3 in winter) | sessions |
| `power_balance.sessions` | week | 2 | 2 | 2 | sessions (5 / 8–10 min) |
| `mobility.sessions` | week | 3 | 3 | 6 | sessions |
| `steps.daily` | day | 7,000 | 8,000 | 12,000 | steps |
| `sleep.duration` | day, weekly average | 420 | 450 | 480 | min |
| `protein.daily` | day | 105 | 120 | 140 | g |
| `fiber.daily` | day | 20 | 25 | 35 | g |
| `rest.days` | week | 1 | 1 | 1 | days |

## Symptoms (seed for `symptom_definitions`)

`name` is the Russian UI label.

| key | Name | Scale | Pinned |
|---|---|---|---|
| `knee` | Колено (knee) | 0–10 | yes |
| `thigh` | Бедро (rectus femoris) | 0–10 | yes |
| `palpitations` | Перебои (palpitations) | yes/no | yes |
| `illness` | Признаки болезни (signs of illness) | yes/no | yes |
| `reflux` | Рефлюкс (reflux) | 0–10 | no |
| `abdomen` | Живот (abdomen) | 0–10 | no |
| `calf` | Икра (calf) | 0–10 | no |
