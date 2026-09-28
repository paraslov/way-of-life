import "server-only";

import type { PoolClient } from "pg";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { resolveSettings, type Settings } from "@/lib/settings";

type StoredSettings = Record<string, unknown>;

/**
 * Reads `userId`'s settings with defaults applied inside an open transaction,
 * creating the row on first access so later merges have something to update.
 */
export async function readSettings(
  client: PoolClient,
  userId: string,
): Promise<Settings> {
  const result = await client.query<{ settings: StoredSettings }>(
    `INSERT INTO user_settings (user_id)
       VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING settings`,
    [userId],
  );
  return resolveSettings(result.rows[0]?.settings ?? {});
}

/** The current user's settings with defaults applied. */
export async function getSettings(): Promise<Settings> {
  return withCurrentUserDb(readSettings);
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
