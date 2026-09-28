import "server-only";

import type { PoolClient } from "pg";
import { shiftId, todayId } from "@/lib/date";
import { ensureUserDefaults } from "@/lib/db/defaults";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";
import { DEFAULT_TARGETS } from "@/lib/seed";
import {
  summarizeWeek,
  type TargetRow,
  type WeekActivity,
  type WeekDay,
  type WeekSummary,
  type WeekVerdict,
  weekStart,
} from "@/lib/week/week";

export async function loadWeekFor(
  client: PoolClient,
  userId: string,
  today: string,
): Promise<WeekSummary> {
  await ensureUserDefaults(client, userId);
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
      `SELECT local_date::text AS local_date, sleep_minutes, steps FROM daily_checkins
        WHERE local_date BETWEEN $1 AND $2`,
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
  return summarizeWeek({
    today,
    targets,
    activities,
    days,
    verdicts,
    order: DEFAULT_TARGETS.map((target) => target.metricKey),
  });
}

/** The current user's week, in their time zone. */
export function getWeekSummary() {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    return loadWeekFor(client, userId, todayId(settings.timezone));
  });
}
