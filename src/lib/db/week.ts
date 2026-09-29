import "server-only";

import type { PoolClient } from "pg";
import { shiftId, todayId } from "@/lib/date";
import { ensureUserDefaults } from "@/lib/db/defaults";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";
import { changedFromRecommendation } from "@/lib/journal/journal";
import { DEFAULT_TARGETS } from "@/lib/seed";
import {
  adviseDeload,
  type DeloadAdvice,
  type WeeklyReviewInput,
  type WeeklyReviewRow,
  type WeekMode,
} from "@/lib/week/context";
import {
  summarizeWeek,
  type TargetRow,
  type WeekActivity,
  type WeekDay,
  type WeekDecision,
  type WeekEvening,
  type WeekSummary,
  type WeekVerdict,
  weekStart,
} from "@/lib/week/week";

export type WeekView = WeekSummary & {
  mode: WeekMode;
  review: WeeklyReviewRow | null;
  deload: DeloadAdvice;
};

export async function loadWeekFor(
  client: PoolClient,
  userId: string,
  today: string,
): Promise<WeekView> {
  await ensureUserDefaults(client, userId);
  const settings = await readSettings(client, userId);
  const start = weekStart(today);
  const end = shiftId(start, 6);
  const targets = (
    await client.query<TargetRow>(
      `SELECT metric_key, period, minimum::float AS minimum,
              target_min::float AS target_min, target_max::float AS target_max,
              active_from::text AS active_from
         FROM targets`,
    )
  ).rows;
  const activities = (
    await client.query<WeekActivity>(
      `SELECT local_date::text AS local_date, type, duration_min FROM activities
        WHERE local_date BETWEEN $1 AND $2`,
      [start, end],
    )
  ).rows;
  const days = (
    await client.query<WeekDay>(
      `SELECT local_date::text AS local_date, sleep_minutes, steps, energy FROM daily_checkins
        WHERE local_date BETWEEN $1 AND $2`,
      [start, end],
    )
  ).rows;
  const evenings = (
    await client.query<WeekEvening>(
      `SELECT local_date::text AS local_date, protein_band, fiber_band
         FROM day_evenings WHERE local_date BETWEEN $1 AND $2 ORDER BY local_date`,
      [start, end],
    )
  ).rows;
  const verdicts = (
    await client.query<WeekVerdict>(
      `SELECT local_date::text AS local_date, snapshot->'light'->>'verdict' AS verdict
         FROM day_decisions WHERE local_date BETWEEN $1 AND $2`,
      [start, end],
    )
  ).rows;
  const decisions = (
    await client.query<WeekDecision>(
      `SELECT local_date::text AS local_date, snapshot->'light'->>'verdict' AS verdict,
              planned_session, recommended_action, chosen_action
         FROM day_decisions WHERE local_date BETWEEN $1 AND $2`,
      [start, end],
    )
  ).rows;
  const mode =
    (
      await client.query<{ mode: WeekMode }>(
        `SELECT mode FROM week_modes WHERE week_start = $1`,
        [start],
      )
    ).rows[0]?.mode ?? "normal";
  const review =
    (
      await client.query<WeeklyReviewRow>(
        `SELECT helped, hurt, change_next, change_text FROM weekly_reviews
        WHERE week_start = $1`,
        [start],
      )
    ).rows[0] ?? null;
  const summary = summarizeWeek({
    today,
    targets,
    activities,
    days,
    verdicts,
    decisions,
    evenings,
    weekTemplate: settings.weekTemplate,
    order: DEFAULT_TARGETS.map((target) => target.metricKey),
  });
  return { ...summary, mode, review, deload: adviseDeload(summary) };
}

/** The current user's week, in their time zone. */
export function getWeekSummary() {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    return loadWeekFor(client, userId, todayId(settings.timezone));
  });
}

export function saveWeekMode(mode: WeekMode) {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    const start = weekStart(todayId(settings.timezone));
    await client.query(
      `INSERT INTO week_modes (user_id, week_start, mode) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, week_start) DO UPDATE
         SET mode = EXCLUDED.mode, updated_at = now()`,
      [userId, start, mode],
    );
  });
}

export function saveWeeklyReview(input: WeeklyReviewInput) {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    const today = todayId(settings.timezone);
    const start = weekStart(today);
    const summary = await loadWeekFor(client, userId, today);
    const decisions = (
      await client.query<{
        chosen_action: "accept" | "keep_original" | "skip" | "custom" | null;
        planned_session: string;
        recommended_action: string;
      }>(
        `SELECT chosen_action, planned_session, recommended_action FROM day_decisions
       WHERE local_date BETWEEN $1 AND $2`,
        [start, summary.end],
      )
    ).rows;
    const snapshot = {
      aerobicMinutes:
        summary.lines.find((line) => line.metricKey === "aerobic.minutes")
          ?.fact ?? null,
      strengthSessions:
        summary.lines.find((line) => line.metricKey === "strength.sessions")
          ?.fact ?? null,
      sleepAverage: summary.deload.sleepAverage,
      energyAverage: summary.energyAverage,
      nonGreenDays: summary.deload.nonGreen,
      chosenDifferent: decisions.filter((decision) =>
        changedFromRecommendation(
          decision.chosen_action,
          decision.planned_session,
          decision.recommended_action,
        ),
      ).length,
    };
    await client.query(
      `INSERT INTO weekly_reviews
         (user_id, week_start, helped, hurt, change_next, change_text, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (user_id, week_start) DO UPDATE SET
         helped = EXCLUDED.helped, hurt = EXCLUDED.hurt,
         change_next = EXCLUDED.change_next, change_text = EXCLUDED.change_text,
         snapshot = EXCLUDED.snapshot, updated_at = now()`,
      [
        userId,
        start,
        input.helped,
        input.hurt,
        input.changeNext,
        input.changeText,
        JSON.stringify(snapshot),
      ],
    );
  });
}
