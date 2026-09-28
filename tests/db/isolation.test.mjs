import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";

// Every user-owned table, with the minimal insert that creates one row for a
// user. Add each new table here: the guard test below fails until you do.
const USER_TABLES = {
  user_settings: "INSERT INTO user_settings (user_id) VALUES ($1)",
  daily_checkins:
    "INSERT INTO daily_checkins (user_id, local_date) VALUES ($1, '2026-09-28')",
  symptom_definitions:
    "INSERT INTO symptom_definitions (user_id, key, name, scale) VALUES ($1, 'knee', 'Колено', '0_10')",
  symptom_entries: `WITH d AS (
      INSERT INTO symptom_definitions (user_id, key, name, scale)
      VALUES ($1, 'calf', 'Икра', '0_10') RETURNING id)
    INSERT INTO symptom_entries (user_id, local_date, symptom_id, severity)
    SELECT $1, '2026-09-28', id, 2 FROM d`,
  day_decisions: `INSERT INTO day_decisions
      (user_id, local_date, rule_version, planned_session, recommended_action, snapshot)
    VALUES ($1, '2026-09-28', '1.0', 'rest', 'rest', '{}')`,
  activities:
    "INSERT INTO activities (user_id, local_date, type) VALUES ($1, '2026-09-28', 'walk')",
  targets: `INSERT INTO targets
      (user_id, metric_key, period, minimum, target_min, target_max, unit, active_from)
    VALUES ($1, 'steps.daily', 'day', 7000, 8000, 12000, 'steps', '2026-09-28')`,
};

// Explicit environment only: never load a developer's .env.local here.
function clients() {
  assert.ok(process.env.DATABASE_ADMIN_URL, "Set DATABASE_ADMIN_URL");
  assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL");
  return {
    admin: new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL }),
    app: new pg.Client({ connectionString: process.env.DATABASE_URL }),
  };
}

test("every table with user_id forces RLS and is covered by this suite", async () => {
  const { admin } = clients();
  try {
    await admin.connect();
    const { rows } = await admin.query(
      `SELECT c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND EXISTS (
            SELECT 1 FROM pg_attribute a
             WHERE a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped)
          AND c.relname <> 'sessions'
        ORDER BY c.relname`,
    );
    for (const row of rows) {
      assert.equal(row.rls, true, `${row.name}: RLS enabled`);
      assert.equal(row.forced, true, `${row.name}: RLS forced`);
    }
    assert.deepEqual(
      rows.map((row) => row.name),
      Object.keys(USER_TABLES).sort(),
    );
  } finally {
    await admin.end();
  }
});

test("runtime grants and transaction-local RLS isolate users", async () => {
  const { admin, app } = clients();
  const users = [randomUUID(), randomUUID()];
  try {
    await admin.connect();
    await app.connect();
    const role = (
      await app.query(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      )
    ).rows[0];
    assert.equal(role.rolsuper, false);
    assert.equal(role.rolbypassrls, false);
    for (const id of users) {
      await admin.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
        [id, `${id}@example.test`],
      );
      for (const insert of Object.values(USER_TABLES)) {
        await admin.query(insert, [id]);
      }
    }
    for (const table of Object.keys(USER_TABLES)) {
      assert.equal((await app.query(`SELECT * FROM ${table}`)).rowCount, 0);
      await app.query("BEGIN");
      await app.query("SELECT set_config('app.current_user_id', $1, true)", [
        users[0],
      ]);
      assert.deepEqual(
        (await app.query(`SELECT DISTINCT user_id FROM ${table}`)).rows,
        [{ user_id: users[0] }],
      );
      assert.equal(
        (await app.query(`DELETE FROM ${table} WHERE user_id = $1`, [users[1]]))
          .rowCount,
        0,
      );
      await assert.rejects(
        app.query(`UPDATE ${table} SET user_id = $1 WHERE user_id = $2`, [
          users[1],
          users[0],
        ]),
        { code: "42501" },
      );
      await app.query("ROLLBACK");
      assert.equal((await app.query(`SELECT * FROM ${table}`)).rowCount, 0);
    }
    await assert.rejects(app.query("SELECT * FROM schema_migrations"), {
      code: "42501",
    });
    await assert.rejects(
      app.query("UPDATE users SET password_hash = 'forbidden' WHERE id = $1", [
        users[0],
      ]),
      { code: "42501" },
    );
    await assert.rejects(
      app.query(
        "INSERT INTO users (email, password_hash) VALUES ('forbidden@example.test', 'forbidden')",
      ),
      { code: "42501" },
    );
  } finally {
    await app.end();
    try {
      await admin.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
        users,
      ]);
    } finally {
      await admin.end();
    }
  }
});

test("a symptom entry cannot point at another user's definition", async () => {
  const { admin } = clients();
  const users = [randomUUID(), randomUUID()];
  try {
    await admin.connect();
    for (const id of users) {
      await admin.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
        [id, `${id}@example.test`],
      );
    }
    const definition = (
      await admin.query(
        "INSERT INTO symptom_definitions (user_id, key, name, scale) VALUES ($1, 'knee', 'Колено', '0_10') RETURNING id",
        [users[0]],
      )
    ).rows[0].id;
    await assert.rejects(
      admin.query(
        "INSERT INTO symptom_entries (user_id, local_date, symptom_id, severity) VALUES ($1, '2026-09-28', $2, 3)",
        [users[1], definition],
      ),
      { code: "23503" },
    );
  } finally {
    try {
      await admin.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
        users,
      ]);
    } finally {
      await admin.end();
    }
  }
});
