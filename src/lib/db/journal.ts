import "server-only";

import type { ActivityType } from "@/lib/activities";
import { shiftId, todayId } from "@/lib/date";
import type { EveningRow } from "@/lib/day/evening";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";
import type {
  ChosenAction,
  DecisionSnapshot,
  RecommendedAction,
} from "@/lib/decision/decision";
import type { PlannedSession } from "@/lib/decision/sessions";
import { changedFromRecommendation } from "@/lib/journal/journal";
import type { LightState } from "@/lib/light/light";
import type { CheckinRow } from "@/lib/today/checkin";

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
type CheckinBrief = JournalDay["checkin"] & { local_date: string };

export function getJournal(range: JournalRange): Promise<JournalDay[]> {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    const today = todayId(settings.timezone);
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
    const checkins = await client.query<CheckinBrief>(
      `SELECT local_date::text AS local_date, sleep_minutes, rhr,
          hrv_status, steps FROM daily_checkins WHERE local_date BETWEEN $1 AND $2`,
      [start, today],
    );
    const evenings = await client.query<EveningRow>(
      `SELECT local_date::text AS local_date, walk_after_meal,
          protein_band, fiber_band, bedtime_target, decision_fit, note
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
    const byCheckin = new Map(
      checkins.rows.map((row) => [row.local_date, row]),
    );
    const byEvening = new Map(
      evenings.rows.map((row) => [row.local_date, row]),
    );
    const byActivities = new Map<string, JournalActivity[]>();
    for (const activity of activities.rows) {
      const list = byActivities.get(activity.local_date) ?? [];
      list.push(activity);
      byActivities.set(activity.local_date, list);
    }
    const days: JournalDay[] = [];
    for (let date = today; date >= start; date = shiftId(date, -1)) {
      const decision = byDecision.get(date);
      days.push({
        date,
        verdict: decision?.snapshot.light.verdict ?? "unknown",
        snapshot: decision?.snapshot ?? null,
        ruleVersion: decision?.rule_version ?? null,
        plannedSession: decision?.planned_session ?? null,
        recommendedAction: decision?.recommended_action ?? null,
        chosenAction: decision?.chosen_action ?? null,
        customText: decision?.custom_text ?? null,
        hrCap: decision?.snapshot.hrCap ?? null,
        checkin: byCheckin.get(date) ?? null,
        evening: byEvening.get(date) ?? null,
        activities: byActivities.get(date) ?? [],
        changed: changedFromRecommendation(
          decision?.chosen_action ?? null,
          decision?.planned_session ?? null,
          decision?.recommended_action ?? null,
        ),
      });
    }
    return days;
  });
}
