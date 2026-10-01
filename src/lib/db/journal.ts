import "server-only";

import type { PoolClient } from "pg";
import type { ActivityType } from "@/lib/activities";
import { shiftId, todayId } from "@/lib/date";
import type { EveningRow } from "@/lib/day/evening";
import { isEditablePastDay } from "@/lib/day/past";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";
import type {
  ChosenAction,
  DecisionSnapshot,
  RecommendedAction,
} from "@/lib/decision/decision";
import type { PlannedSession } from "@/lib/decision/sessions";
import { changedFromRecommendation } from "@/lib/journal/journal";
import {
  type DayObservations,
  evaluateLight,
  type LightResult,
  type LightState,
} from "@/lib/light/light";
import {
  type CheckinRow,
  type SymptomEntryRow,
  toObservations,
} from "@/lib/today/checkin";

export type JournalRange = 7 | 30 | "all";
export type JournalActivity = {
  local_date: string;
  type: ActivityType;
  duration_min: number | null;
  rpe: number | null;
};
export type JournalDay = {
  date: string;
  verdict: LightState;
  snapshot: DecisionSnapshot | null;
  ruleVersion: string | null;
  plannedSession: PlannedSession | null;
  recommendedAction: RecommendedAction | null;
  chosenAction: ChosenAction | null;
  customText: string | null;
  hrCap: number | null;
  checkin: Pick<
    CheckinRow,
    "sleep_minutes" | "rhr" | "hrv_status" | "steps"
  > | null;
  evening: EveningRow | null;
  activities: JournalActivity[];
  changed: boolean;
  /** Inside the fill-in window (D27). */
  editable: boolean;
  /**
   * A morning entered after its day ended, read by the current rules:
   * `filled` — there was no decision that day, `corrected` — the saved
   * decision stands and this is shown next to it.
   */
  late: { kind: "filled" | "corrected"; light: LightResult } | null;
};

type DecisionRow = {
  local_date: string;
  snapshot: DecisionSnapshot;
  rule_version: string;
  planned_session: PlannedSession;
  recommended_action: RecommendedAction;
  chosen_action: ChosenAction | null;
  custom_text: string | null;
};
type JournalCheckin = CheckinRow & { late_edited_at: string | null };

/** Days of history the light reads for a late verdict: the RHR window. */
const HISTORY_DAYS = 28;

const MORNING_FIELDS = [
  "sleep_minutes",
  "rhr",
  "hrv_status",
  "energy",
  "desire",
  "legs",
] as const;

export function getJournal(range: JournalRange): Promise<JournalDay[]> {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    return loadJournalFor(
      client,
      todayId(settings.timezone),
      range,
      settings.rhrStartBaseline,
    );
  });
}

export async function loadJournalFor(
  client: PoolClient,
  today: string,
  range: JournalRange,
  rhrStartBaseline: number,
): Promise<JournalDay[]> {
  const first = (
    await client.query<{ first: string | null }>(
      `SELECT min(local_date)::text AS first FROM (
        SELECT local_date FROM daily_checkins UNION ALL
        SELECT local_date FROM day_evenings UNION ALL
        SELECT local_date FROM day_decisions UNION ALL
        SELECT local_date FROM activities
      ) recorded`,
    )
  ).rows[0]?.first;
  if (!first) return [];
  const start =
    range === "all"
      ? first
      : ([first, shiftId(today, 1 - range)].sort().at(-1) ?? first);
  const decisions = await client.query<DecisionRow>(
    `SELECT local_date::text AS local_date, snapshot, rule_version,
          planned_session, recommended_action, chosen_action, custom_text
        FROM day_decisions WHERE local_date BETWEEN $1 AND $2`,
    [start, today],
  );
  // Earlier mornings too: a late verdict needs its baseline window.
  const checkins = await client.query<JournalCheckin>(
    `SELECT local_date::text AS local_date, sleep_minutes, sleep_score, rhr,
          hrv_ms, hrv_status, energy, desire, legs, steps, red_flags, note,
          late_edited_at
        FROM daily_checkins WHERE local_date BETWEEN $1 AND $2`,
    [shiftId(start, -HISTORY_DAYS), today],
  );
  const entries = await client.query<SymptomEntryRow>(
    `SELECT e.local_date::text AS local_date, e.symptom_id, d.key,
              e.severity, e.context, e.heart_rate
         FROM symptom_entries e
         JOIN symptom_definitions d ON d.id = e.symptom_id
        WHERE e.local_date BETWEEN $1 AND $2`,
    [shiftId(start, -HISTORY_DAYS), today],
  );
  const evenings = await client.query<EveningRow>(
    `SELECT local_date::text AS local_date, walk_after_meal,
          protein_band, fiber_band, bedtime_target, decision_fit, mood, note
        FROM day_evenings WHERE local_date BETWEEN $1 AND $2`,
    [start, today],
  );
  const activities = await client.query<JournalActivity>(
    `SELECT local_date::text AS local_date, type, duration_min, rpe
        FROM activities WHERE local_date BETWEEN $1 AND $2 ORDER BY local_date, created_at`,
    [start, today],
  );
  const byDecision = new Map(
    decisions.rows.map((row) => [row.local_date, row]),
  );
  const byCheckin = new Map(checkins.rows.map((row) => [row.local_date, row]));
  const observations = new Map<string, DayObservations>();
  const observed = (date: string) => {
    let day = observations.get(date);
    if (!day) {
      day = toObservations(date, byCheckin.get(date), entries.rows);
      observations.set(date, day);
    }
    return day;
  };
  const recorded = new Set([
    ...byCheckin.keys(),
    ...entries.rows.map((entry) => entry.local_date),
  ]);
  const lateLight = (date: string) =>
    evaluateLight({
      today: observed(date),
      history: [...recorded]
        .filter((day) => day < date && day >= shiftId(date, -HISTORY_DAYS))
        .map(observed),
      rhrStartBaseline,
    });
  const byEvening = new Map(evenings.rows.map((row) => [row.local_date, row]));
  const byActivities = new Map<string, JournalActivity[]>();
  for (const activity of activities.rows) {
    const list = byActivities.get(activity.local_date) ?? [];
    list.push(activity);
    byActivities.set(activity.local_date, list);
  }
  const days: JournalDay[] = [];
  for (let date = today; date >= start; date = shiftId(date, -1)) {
    const decision = byDecision.get(date);
    const checkin = byCheckin.get(date);
    const hasMorning =
      (checkin !== undefined &&
        MORNING_FIELDS.some((field) => checkin[field] !== null)) ||
      entries.rows.some((entry) => entry.local_date === date);
    let late: JournalDay["late"] = null;
    if (!decision && hasMorning && date < today) {
      late = { kind: "filled", light: lateLight(date) };
    } else if (decision && checkin?.late_edited_at) {
      late = { kind: "corrected", light: lateLight(date) };
    }
    days.push({
      date,
      verdict:
        decision?.snapshot.light.verdict ??
        (late?.kind === "filled" ? late.light.verdict : "unknown"),
      snapshot: decision?.snapshot ?? null,
      ruleVersion: decision?.rule_version ?? null,
      plannedSession: decision?.planned_session ?? null,
      recommendedAction: decision?.recommended_action ?? null,
      chosenAction: decision?.chosen_action ?? null,
      customText: decision?.custom_text ?? null,
      hrCap: decision?.snapshot.hrCap ?? null,
      checkin: checkin
        ? {
            sleep_minutes: checkin.sleep_minutes,
            rhr: checkin.rhr,
            hrv_status: checkin.hrv_status,
            steps: checkin.steps,
          }
        : null,
      evening: byEvening.get(date) ?? null,
      activities: byActivities.get(date) ?? [],
      changed: changedFromRecommendation(
        decision?.chosen_action ?? null,
        decision?.planned_session ?? null,
        decision?.recommended_action ?? null,
      ),
      editable: isEditablePastDay(date, today),
      late,
    });
  }
  return days;
}
