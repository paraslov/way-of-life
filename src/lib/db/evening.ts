import "server-only";

import type { PoolClient } from "pg";
import { todayId } from "@/lib/date";
import type { EveningInput, EveningRow } from "@/lib/day/evening";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";

export async function saveEveningFor(
  client: PoolClient,
  userId: string,
  date: string,
  input: EveningInput,
) {
  await client.query(
    `INSERT INTO daily_checkins (user_id, local_date, steps)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, local_date) DO UPDATE
       SET steps = EXCLUDED.steps, updated_at = now()`,
    [userId, date, input.steps],
  );
  await client.query(
    `INSERT INTO day_evenings
       (user_id, local_date, walk_after_meal, protein_band, fiber_band,
        bedtime_target, decision_fit, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, local_date) DO UPDATE SET
       walk_after_meal = EXCLUDED.walk_after_meal,
       protein_band = EXCLUDED.protein_band,
       fiber_band = EXCLUDED.fiber_band,
       bedtime_target = EXCLUDED.bedtime_target,
       decision_fit = EXCLUDED.decision_fit,
       note = EXCLUDED.note,
       updated_at = now()`,
    [
      userId,
      date,
      input.walkAfterMeal,
      input.proteinBand,
      input.fiberBand,
      input.bedtimeTarget,
      input.decisionFit,
      input.note,
    ],
  );
}

export function getEveningFor(client: PoolClient, date: string) {
  return client.query<EveningRow>(
    `SELECT local_date::text AS local_date, walk_after_meal, protein_band,
            fiber_band, bedtime_target, decision_fit, note
       FROM day_evenings WHERE local_date = $1`,
    [date],
  );
}

export function saveEvening(input: EveningInput) {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    await saveEveningFor(client, userId, todayId(settings.timezone), input);
  });
}
