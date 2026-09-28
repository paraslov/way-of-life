import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { runMigrations } from "../../scripts/lib/migrations.mjs";

// An isolated schema in the explicitly configured disposable test database.
test(
  "migrations serialize, skip applied files and roll back a failed file",
  { timeout: 20_000 },
  async () => {
    assert.ok(process.env.DATABASE_ADMIN_URL, "Set DATABASE_ADMIN_URL");
    const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "way-of-life-migrations-"),
    );
    const first = new pg.Client({
      connectionString: process.env.DATABASE_ADMIN_URL,
    });
    const second = new pg.Client({
      connectionString: process.env.DATABASE_ADMIN_URL,
    });
    try {
      await first.connect();
      await second.connect();
      await first.query(`CREATE SCHEMA ${schema}`);
      await first.query(`SET search_path TO ${schema}`);
      await second.query(`SET search_path TO ${schema}`);
      await writeFile(
        path.join(directory, "0001_initial.sql"),
        "CREATE TABLE marker (value integer); SELECT pg_sleep(0.1); INSERT INTO marker VALUES (1);",
      );
      const logs = [];
      await Promise.all([
        runMigrations(first, directory, (line) => logs.push(line)),
        runMigrations(second, directory, (line) => logs.push(line)),
      ]);
      assert.deepEqual(logs.sort(), [
        "apply 0001_initial.sql",
        "skip 0001_initial.sql",
      ]);
      assert.deepEqual((await first.query("SELECT * FROM marker")).rows, [
        { value: 1 },
      ]);

      // A committed file before a failing file remains applied. Changes made
      // inside the failed file and its metadata must both roll back.
      await writeFile(
        path.join(directory, "0002_next.sql"),
        "INSERT INTO marker VALUES (2);",
      );
      await writeFile(
        path.join(directory, "0003_failure.sql"),
        "INSERT INTO marker VALUES (3); SELECT * FROM missing_table;",
      );
      await assert.rejects(
        runMigrations(first, directory, () => {}),
        { code: "42P01" },
      );
      assert.deepEqual(
        (await first.query("SELECT value FROM marker ORDER BY value")).rows,
        [{ value: 1 }, { value: 2 }],
      );
      assert.deepEqual(
        (await first.query("SELECT name FROM schema_migrations ORDER BY name"))
          .rows,
        [{ name: "0001_initial.sql" }, { name: "0002_next.sql" }],
      );

      // The lock must be released after failure so another connection can retry.
      await writeFile(
        path.join(directory, "0003_failure.sql"),
        "INSERT INTO marker VALUES (3);",
      );
      await runMigrations(second, directory, () => {});
      await runMigrations(first, directory, () => {});
      assert.deepEqual(
        (await first.query("SELECT value FROM marker ORDER BY value")).rows,
        [{ value: 1 }, { value: 2 }, { value: 3 }],
      );
    } finally {
      await second.end();
      try {
        await first.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await first.end();
        await rm(directory, { recursive: true, force: true });
      }
    }
  },
);
