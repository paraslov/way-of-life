import "server-only";

import type { PoolClient } from "pg";
import type { ActivityType } from "@/lib/activities";
import { shiftId, todayId } from "@/lib/date";
import type { EveningRow } from "@/lib/day/evening";
import { ensureUserDefaults } from "@/lib/db/defaults";
import { getEveningFor } from "@/lib/db/evening";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";
import {
  type ChosenAction,
  type DayDecision,
  type DecisionSnapshot,
  decideDay,
  RED_FLAGS,
  type RecommendedAction,
  type RedFlag,
} from "@/lib/decision/decision";
import type { PlannedSession } from "@/lib/decision/sessions";
import { type DayObservations, evaluateLight } from "@/lib/light/light";
import type { Settings } from "@/lib/settings";
import {
  type CheckinInput,
  type CheckinRow,
  type SymptomEntryRow,
  toObservations,
} from "@/lib/today/checkin";

/**
 * Today repository. The `*For` functions take an open RLS transaction so the
 * database tests can drive them; the exported wrappers resolve the current
 * user and their calendar day.
 */

/** Days of history the rules read: the RHR baseline window. */
const HISTORY_DAYS = 28;

const CHECKIN_COLUMNS = `local_date::text AS local_date, sleep_minutes, sleep_score, rhr,
  hrv_ms, hrv_status, energy, desire, legs, steps, red_flags, note`;

export type SymptomDefinition = {
  id: string;
  key: string;
  name: string;
  scale: "0_10" | "bool";
  pinned: boolean;
};

export type StoredDecision = {
  ruleVersion: string;
  plannedSession: PlannedSession;
  recommendedAction: RecommendedAction;
  chosenAction: ChosenAction | null;
  customText: string | null;
  snapshot: DecisionSnapshot;
};

export type ActivityRow = {
  id: string;
  type: ActivityType;
  duration_min: number | null;
  rpe: number | null;
};

export type TodayView = {
  date: string;
  settings: Settings;
  checkin: CheckinRow | null;
  /** The latest earlier check-in, to prefill the form. */
  previous: CheckinRow | null;
  symptoms: SymptomDefinition[];
  entries: SymptomEntryRow[];
  previousEntries: SymptomEntryRow[];
  decision: StoredDecision | null;
  activities: ActivityRow[];
  evening: EveningRow | null;
  history: DayObservations[];
  lastIntensityDate: string | null;
};

async function checkinsBetween(
  client: PoolClient,
  from: string,
  to: string,
): Promise<CheckinRow[]> {
  return (
    await client.query<CheckinRow>(
      `SELECT ${CHECKIN_COLUMNS} FROM daily_checkins
        WHERE local_date BETWEEN $1 AND $2 ORDER BY local_date`,
      [from, to],
    )
  ).rows;
}

async function entriesBetween(
  client: PoolClient,
  from: string,
  to: string,
): Promise<SymptomEntryRow[]> {
  return (
    await client.query<SymptomEntryRow>(
      `SELECT e.local_date::text AS local_date, e.symptom_id, d.key,
              e.severity, e.context, e.heart_rate
         FROM symptom_entries e
         JOIN symptom_definitions d ON d.id = e.symptom_id
        WHERE e.local_date BETWEEN $1 AND $2`,
      [from, to],
    )
  ).rows;
}

function toStoredDecision(row: {
  rule_version: string;
  planned_session: PlannedSession;
  recommended_action: RecommendedAction;
  chosen_action: ChosenAction | null;
  custom_text: string | null;
  snapshot: DecisionSnapshot;
}): StoredDecision {
  return {
    ruleVersion: row.rule_version,
    plannedSession: row.planned_session,
    recommendedAction: row.recommended_action,
    chosenAction: row.chosen_action,
    customText: row.custom_text,
    snapshot: row.snapshot,
  };
}

const SAME_QUESTION = `day_decisions.recommended_action = EXCLUDED.recommended_action
  AND day_decisions.planned_session = EXCLUDED.planned_session`;

/**
 * Evaluates the light and the decision for `date` from what is stored and
 * writes the decision. A changed recommendation clears an earlier choice,
 * since it answered a different question.
 */
export async function recomputeDecisionFor(
  client: PoolClient,
  userId: string,
  date: string,
  settings: Settings,
): Promise<DayDecision> {
  const from = shiftId(date, -HISTORY_DAYS);
  const rows = await checkinsBetween(client, from, date);
  const entries = await entriesBetween(client, from, date);
  const byDate = new Map(rows.map((row) => [row.local_date, row]));
  const dates = new Set([
    ...rows.map((row) => row.local_date),
    ...entries.map((entry) => entry.local_date),
  ]);
  dates.delete(date);
  const history = [...dates].map((day) =>
    toObservations(day, byDate.get(day), entries),
  );
  const observations = toObservations(date, byDate.get(date), entries);
  const light = evaluateLight({
    today: observations,
    history,
    rhrStartBaseline: settings.rhrStartBaseline,
  });
  const lastIntensity = await client.query<{ day: string | null }>(
    `SELECT max(local_date)::text AS day FROM activities
      WHERE type = 'intensity' AND local_date < $1`,
    [date],
  );
  const redFlags = (byDate.get(date)?.red_flags ?? []).filter(
    (flag): flag is RedFlag => (RED_FLAGS as readonly string[]).includes(flag),
  );
  const decision = decideDay({
    date,
    weekTemplate: settings.weekTemplate,
    light,
    observations,
    redFlags,
    lastIntensityDate: lastIntensity.rows[0]?.day ?? null,
    lthr: settings.lthr,
  });

  await client.query(
    `INSERT INTO day_decisions
       (user_id, local_date, rule_version, planned_session, recommended_action, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (user_id, local_date) DO UPDATE SET
       rule_version = EXCLUDED.rule_version,
       planned_session = EXCLUDED.planned_session,
       recommended_action = EXCLUDED.recommended_action,
       snapshot = EXCLUDED.snapshot,
       -- SET expressions read the old row: keep the choice only if the
       -- question it answered is unchanged.
       chosen_action = CASE WHEN ${SAME_QUESTION} THEN day_decisions.chosen_action END,
       custom_text = CASE WHEN ${SAME_QUESTION} THEN day_decisions.custom_text END,
       decided_at = CASE WHEN ${SAME_QUESTION} THEN day_decisions.decided_at END,
       updated_at = now()`,
    [
      userId,
      date,
      decision.ruleVersion,
      decision.plannedSession,
      decision.recommendedAction,
      JSON.stringify(decision.snapshot),
    ],
  );
  return decision;
}

/**
 * Writes the morning observations and symptoms. A late write (a past day,
 * D27) keeps that morning's red flags, which were for acting then, and marks
 * the morning as entered after its day ended.
 */
async function writeCheckinFor(
  client: PoolClient,
  userId: string,
  date: string,
  input: CheckinInput,
  late: boolean,
) {
  await client.query(
    `INSERT INTO daily_checkins
       (user_id, local_date, sleep_minutes, sleep_score, rhr, hrv_ms, hrv_status,
        energy, desire, legs, red_flags, note, late_edited_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             CASE WHEN $13::boolean THEN now() END)
     ON CONFLICT (user_id, local_date) DO UPDATE SET
       sleep_minutes = EXCLUDED.sleep_minutes,
       sleep_score = EXCLUDED.sleep_score,
       rhr = EXCLUDED.rhr,
       hrv_ms = EXCLUDED.hrv_ms,
       hrv_status = EXCLUDED.hrv_status,
       energy = EXCLUDED.energy,
       desire = EXCLUDED.desire,
       legs = EXCLUDED.legs,
       red_flags = CASE WHEN $13::boolean THEN daily_checkins.red_flags
                        ELSE EXCLUDED.red_flags END,
       note = EXCLUDED.note,
       late_edited_at = CASE WHEN $13::boolean THEN now()
                             ELSE daily_checkins.late_edited_at END,
       updated_at = now()`,
    [
      userId,
      date,
      input.sleepMinutes,
      input.sleepScore,
      input.rhr,
      input.hrvMs,
      input.hrvStatus,
      input.energy,
      input.desire,
      input.legs,
      late ? [] : input.redFlags,
      input.note || null,
      late,
    ],
  );

  for (const symptom of input.symptoms) {
    if (symptom.severity === null) {
      await client.query(
        "DELETE FROM symptom_entries WHERE local_date = $1 AND symptom_id = $2",
        [date, symptom.symptomId],
      );
      continue;
    }
    await client.query(
      `INSERT INTO symptom_entries
         (user_id, local_date, symptom_id, severity, context, heart_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, local_date, symptom_id) DO UPDATE SET
         severity = EXCLUDED.severity,
         context = EXCLUDED.context,
         heart_rate = EXCLUDED.heart_rate,
         updated_at = now()`,
      [
        userId,
        date,
        symptom.symptomId,
        symptom.severity,
        symptom.atRest ? "rest" : null,
        symptom.heartRate,
      ],
    );
  }
}

export async function saveCheckinFor(
  client: PoolClient,
  userId: string,
  date: string,
  input: CheckinInput,
  settings: Settings,
): Promise<DayDecision> {
  await writeCheckinFor(client, userId, date, input, false);
  return recomputeDecisionFor(client, userId, date, settings);
}

/**
 * Fills in or corrects the morning of a finished day. Its decision is never
 * recomputed or created (D25): the journal shows the current-rules verdict
 * next to it instead.
 */
export async function saveLateCheckinFor(
  client: PoolClient,
  userId: string,
  date: string,
  input: CheckinInput,
) {
  await writeCheckinFor(client, userId, date, input, true);
}

/** Records the user's answer; `false` when there is no decision for the day. */
export async function chooseActionFor(
  client: PoolClient,
  date: string,
  chosen: ChosenAction | null,
  customText: string | null,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE day_decisions
        SET chosen_action = $2, custom_text = $3,
            decided_at = CASE WHEN $2::text IS NULL THEN NULL ELSE now() END,
            updated_at = now()
      WHERE local_date = $1`,
    [date, chosen, chosen === "custom" ? customText : null],
  );
  return (result.rowCount ?? 0) > 0;
}

export type ActivityInput = {
  type: ActivityType;
  durationMin: number | null;
  rpe: number | null;
};

export async function addActivityFor(
  client: PoolClient,
  userId: string,
  date: string,
  activity: ActivityInput,
) {
  await client.query(
    `INSERT INTO activities (user_id, local_date, type, duration_min, rpe)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, date, activity.type, activity.durationMin, activity.rpe],
  );
}

export async function saveStepsFor(
  client: PoolClient,
  userId: string,
  date: string,
  steps: number | null,
) {
  await client.query(
    `INSERT INTO daily_checkins (user_id, local_date, steps) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, local_date) DO UPDATE
       SET steps = EXCLUDED.steps, updated_at = now()`,
    [userId, date, steps],
  );
}

export async function loadTodayFor(
  client: PoolClient,
  userId: string,
  date: string,
): Promise<TodayView> {
  await ensureUserDefaults(client, userId);
  const settings = await readSettings(client, userId);
  const checkin =
    (
      await client.query<CheckinRow>(
        `SELECT ${CHECKIN_COLUMNS} FROM daily_checkins WHERE local_date = $1`,
        [date],
      )
    ).rows[0] ?? null;
  // Steps alone do not make a morning check-in to prefill from.
  const previous =
    (
      await client.query<CheckinRow>(
        `SELECT ${CHECKIN_COLUMNS} FROM daily_checkins
          WHERE local_date < $1 AND local_date >= $2
            AND num_nonnulls(sleep_minutes, rhr, hrv_status, energy, desire, legs) > 0
          ORDER BY local_date DESC LIMIT 1`,
        [date, shiftId(date, -HISTORY_DAYS)],
      )
    ).rows[0] ?? null;
  const symptoms = (
    await client.query<SymptomDefinition>(
      `SELECT id, key, name, scale, pinned FROM symptom_definitions
        WHERE NOT archived ORDER BY sort, name`,
    )
  ).rows;
  const entries = await entriesBetween(client, date, date);
  const previousEntries = previous
    ? await entriesBetween(client, previous.local_date, previous.local_date)
    : [];
  const decisionRow = (
    await client.query(
      `SELECT rule_version, planned_session, recommended_action, chosen_action,
              custom_text, snapshot
         FROM day_decisions WHERE local_date = $1`,
      [date],
    )
  ).rows[0];
  const activities = (
    await client.query<ActivityRow>(
      `SELECT id, type, duration_min, rpe FROM activities
        WHERE local_date = $1 ORDER BY created_at`,
      [date],
    )
  ).rows;
  const evening = (await getEveningFor(client, date)).rows[0] ?? null;
  const historyRows = await checkinsBetween(
    client,
    shiftId(date, -HISTORY_DAYS),
    shiftId(date, -1),
  );
  const historyEntries = await entriesBetween(
    client,
    shiftId(date, -HISTORY_DAYS),
    shiftId(date, -1),
  );
  const historyByDate = new Map(
    historyRows.map((row) => [row.local_date, row]),
  );
  const historyDates = new Set([
    ...historyRows.map((row) => row.local_date),
    ...historyEntries.map((entry) => entry.local_date),
  ]);
  const history = [...historyDates]
    .sort()
    .map((day) => toObservations(day, historyByDate.get(day), historyEntries));
  const lastIntensityDate =
    (
      await client.query<{ day: string | null }>(
        `SELECT max(local_date)::text AS day FROM activities
        WHERE type = 'intensity' AND local_date < $1`,
        [date],
      )
    ).rows[0]?.day ?? null;

  return {
    date,
    settings,
    checkin,
    previous,
    symptoms,
    entries,
    previousEntries,
    decision: decisionRow ? toStoredDecision(decisionRow) : null,
    activities,
    evening,
    history,
    lastIntensityDate,
  };
}

/** Runs `callback` for the current user on their calendar day. */
async function onUserToday<T>(
  callback: (
    client: PoolClient,
    userId: string,
    date: string,
    settings: Settings,
  ) => Promise<T>,
) {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    return callback(client, userId, todayId(settings.timezone), settings);
  });
}

export function getTodayView() {
  return onUserToday((client, userId, date) =>
    loadTodayFor(client, userId, date),
  );
}

export function saveCheckin(input: CheckinInput) {
  return onUserToday((client, userId, date, settings) =>
    saveCheckinFor(client, userId, date, input, settings),
  );
}

export function chooseAction(
  chosen: ChosenAction | null,
  customText: string | null,
) {
  return onUserToday((client, _userId, date) =>
    chooseActionFor(client, date, chosen, customText),
  );
}

export function addActivity(activity: ActivityInput) {
  return onUserToday((client, userId, date) =>
    addActivityFor(client, userId, date, activity),
  );
}

export function removeActivity(id: string) {
  return withCurrentUserDb(async (client) => {
    await client.query("DELETE FROM activities WHERE id = $1", [id]);
  });
}

export function saveSteps(steps: number | null) {
  return onUserToday((client, userId, date) =>
    saveStepsFor(client, userId, date, steps),
  );
}
