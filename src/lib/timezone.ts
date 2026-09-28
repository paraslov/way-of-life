import "server-only";

import { getCurrentUser } from "@/auth/session";
import { DEFAULT_TIMEZONE, normalizeTimeZone } from "@/lib/date";
import { withCurrentUserDb } from "@/lib/db/user-context";

/**
 * Resolves the active time zone for the current request from
 * `user_settings.settings.timezone`, falling back to `Asia/Almaty`. Never throws
 * — calendar-day math must not break rendering — and skips the lookup when
 * there is no session.
 */
export async function resolveTimeZone(): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (!user) return DEFAULT_TIMEZONE;
    const stored = await withCurrentUserDb(async (client, userId) => {
      const result = await client.query<{ timezone: string | null }>(
        "SELECT settings->>'timezone' AS timezone FROM user_settings WHERE user_id = $1",
        [userId],
      );
      return result.rows[0]?.timezone ?? null;
    });
    return normalizeTimeZone(stored);
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
