import "server-only";

import type { PoolClient } from "pg";
import { getMetric } from "@/lib/metrics/registry";
import {
  DEFAULT_SYMPTOMS,
  DEFAULT_TARGETS,
  DEFAULT_TARGETS_FROM,
} from "@/lib/seed";

/**
 * Writes the starting symptoms and targets for `userId` if they are missing.
 * Idempotent and cheap enough to run on every Today load: symptoms are keyed
 * by (user, key), so archived or renamed ones stay as the user left them, and
 * targets are only written when the user has none at all. Settings need no
 * seed: `resolveSettings` supplies the defaults.
 */
export async function ensureUserDefaults(client: PoolClient, userId: string) {
  await client.query(
    `INSERT INTO symptom_definitions (user_id, key, name, scale, pinned, sort)
     SELECT $1, s.key, s.name, s.scale, s.pinned, s.sort
       FROM jsonb_to_recordset($2::jsonb)
         AS s(key text, name text, scale text, pinned boolean, sort smallint)
     ON CONFLICT (user_id, key) DO NOTHING`,
    [
      userId,
      JSON.stringify(
        DEFAULT_SYMPTOMS.map((symptom, index) => ({ ...symptom, sort: index })),
      ),
    ],
  );

  await client.query(
    `INSERT INTO targets
       (user_id, metric_key, period, minimum, target_min, target_max, unit, active_from)
     SELECT $1, t.metric_key, t.period, t.minimum, t.target_min, t.target_max, t.unit, $3
       FROM jsonb_to_recordset($2::jsonb)
         AS t(metric_key text, period text, minimum numeric, target_min numeric,
              target_max numeric, unit text)
      WHERE NOT EXISTS (SELECT 1 FROM targets WHERE user_id = $1)`,
    [
      userId,
      JSON.stringify(
        DEFAULT_TARGETS.map((target) => ({
          metric_key: target.metricKey,
          period: target.period,
          minimum: target.minimum,
          target_min: target.targetMin,
          target_max: target.targetMax,
          unit: getMetric(target.metricKey).unit,
        })),
      ),
      DEFAULT_TARGETS_FROM,
    ],
  );
}
