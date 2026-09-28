import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// A session lock requires a direct connection held for the entire run.
// All migration entry points must use this same key.
const migrationLock = [427119, 1];

export async function runMigrations(client, directory, log = console.log) {
  let locked = false;
  try {
    // Bound waits for both the runner lock and schema locks. Fail the release
    // instead of silently skipping migrations when another runner holds a lock.
    await client.query("SET lock_timeout = '60s'");
    await client.query("SELECT pg_advisory_lock($1, $2)", migrationLock);
    locked = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const names = (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const name of names) {
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name],
      );
      if (applied.rowCount) {
        log(`skip ${name}`);
        continue;
      }
      const sql = await readFile(path.join(directory, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          name,
        ]);
        await client.query("COMMIT");
        log(`apply ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (locked) {
      await client.query("SELECT pg_advisory_unlock($1, $2)", migrationLock);
    }
  }
}
