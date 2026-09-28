import "server-only";

import { withCurrentUserDb } from "@/lib/db/user-context";
import { resolveSettings, type Settings } from "@/lib/settings";

type StoredSettings = Record<string, unknown>;

/**
 * Reads the current user's settings with defaults applied, creating the row on
 * first access so later merges have something to update.
 */
export async function getSettings(): Promise<Settings> {
  return withCurrentUserDb(async (client, userId) => {
    const result = await client.query<{ settings: StoredSettings }>(
      `INSERT INTO user_settings (user_id)
         VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING settings`,
      [userId],
    );
    return resolveSettings(result.rows[0]?.settings ?? {});
  });
}

/** Shallow-merges an already validated `patch` into the settings bag. */
export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await withCurrentUserDb(async (client, userId) => {
    await client.query(
      `INSERT INTO user_settings (user_id, settings)
         VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE
         SET settings = user_settings.settings || EXCLUDED.settings,
             updated_at = now()`,
      [userId, JSON.stringify(patch)],
    );
  });
}
