import "server-only";

import type { PoolClient } from "pg";
import { requireCurrentUser } from "@/auth/session";
import { withTransaction } from "@/lib/db/client";

/**
 * Runs user-owned queries in a transaction with the PostgreSQL RLS identity set.
 * Every query to an RLS-protected table must use the supplied transaction client.
 */
export async function withCurrentUserDb<T>(
  callback: (client: PoolClient, userId: string) => Promise<T>,
) {
  const user = await requireCurrentUser();

  return withTransaction(async (client) => {
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [
      user.id,
    ]);
    return callback(client, user.id);
  });
}
