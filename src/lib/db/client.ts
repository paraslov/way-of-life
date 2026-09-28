import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForDatabase = globalThis as unknown as { wayOfLifePool?: Pool };
let runtimeRoleCheck: Promise<void> | undefined;

type RuntimeRoleRow = {
  rolname: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool() {
  if (!globalForDatabase.wayOfLifePool) {
    globalForDatabase.wayOfLifePool = createPool();
  }

  return globalForDatabase.wayOfLifePool;
}

async function assertSafeRuntimeRole(pool: Pool) {
  if (!runtimeRoleCheck) {
    runtimeRoleCheck = pool
      .query<RuntimeRoleRow>(
        `SELECT rolname, rolsuper, rolbypassrls
           FROM pg_roles
          WHERE rolname = current_user`,
      )
      .then((result) => {
        const role = result.rows[0];
        if (!role || role.rolsuper || role.rolbypassrls) {
          throw new Error(
            "DATABASE_URL must use a NOSUPERUSER/NOBYPASSRLS runtime role",
          );
        }
      })
      .catch((error) => {
        runtimeRoleCheck = undefined;
        throw error;
      });
  }

  await runtimeRoleCheck;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  const pool = getPool();
  await assertSafeRuntimeRole(pool);
  return pool.query<T>(text, [...values]);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const pool = getPool();
  await assertSafeRuntimeRole(pool);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
