import { randomUUID } from "node:crypto";
import pg from "pg";

// Explicit environment only: never load a developer's .env.local here.
export function adminClient() {
  if (!process.env.DATABASE_ADMIN_URL)
    throw new Error("Set DATABASE_ADMIN_URL");
  return new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL });
}

export function appClient() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL");
  return new pg.Client({ connectionString: process.env.DATABASE_URL });
}

export async function createTestUser(admin: pg.Client) {
  const id = randomUUID();
  await admin.query(
    "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
    [id, `${id}@example.test`],
  );
  return id;
}

/**
 * Runs `callback` as the runtime role with the RLS identity of `userId`, the
 * way `withCurrentUserDb` does, and commits.
 */
export async function asUser<T>(
  app: pg.Client,
  userId: string,
  callback: (client: pg.PoolClient) => Promise<T>,
) {
  await app.query("BEGIN");
  try {
    await app.query("SELECT set_config('app.current_user_id', $1, true)", [
      userId,
    ]);
    const result = await callback(app as unknown as pg.PoolClient);
    await app.query("COMMIT");
    return result;
  } catch (error) {
    await app.query("ROLLBACK");
    throw error;
  }
}
