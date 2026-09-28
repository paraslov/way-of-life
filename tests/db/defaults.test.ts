import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureUserDefaults } from "@/lib/db/defaults";
import { DEFAULT_SYMPTOMS, DEFAULT_TARGETS } from "@/lib/seed";
import { adminClient, appClient, asUser, createTestUser } from "./helpers";

describe("ensureUserDefaults", () => {
  let admin: pg.Client;
  let app: pg.Client;
  let userId: string;

  beforeAll(async () => {
    admin = adminClient();
    app = appClient();
    await admin.connect();
    await app.connect();
    userId = await createTestUser(admin);
  });

  afterAll(async () => {
    await app.end();
    await admin.query("DELETE FROM users WHERE id = $1", [userId]);
    await admin.end();
  });

  it("seeds symptoms and targets once and keeps the user's edits", async () => {
    await asUser(app, userId, (client) => ensureUserDefaults(client, userId));
    await asUser(app, userId, (client) =>
      client.query(
        "UPDATE symptom_definitions SET archived = true, name = 'Моё колено' WHERE key = 'knee'",
      ),
    );
    await asUser(app, userId, (client) =>
      client.query("DELETE FROM targets WHERE metric_key = 'fiber.daily'"),
    );
    await asUser(app, userId, (client) => ensureUserDefaults(client, userId));

    const symptoms = await asUser(
      app,
      userId,
      async (client) =>
        (
          await client.query(
            "SELECT key, name, pinned, archived FROM symptom_definitions ORDER BY sort",
          )
        ).rows,
    );
    expect(symptoms.map((row) => row.key)).toEqual(
      DEFAULT_SYMPTOMS.map((symptom) => symptom.key),
    );
    expect(symptoms[0]).toEqual({
      key: "knee",
      name: "Моё колено",
      pinned: true,
      archived: true,
    });
    expect(symptoms.filter((row) => row.pinned).map((row) => row.key)).toEqual([
      "knee",
      "thigh",
      "palpitations",
      "illness",
    ]);

    const targets = await asUser(
      app,
      userId,
      async (client) =>
        (
          await client.query(
            "SELECT metric_key, unit, minimum::float AS minimum FROM targets",
          )
        ).rows,
    );
    // Targets already existed, so the deleted one is not brought back.
    expect(targets).toHaveLength(DEFAULT_TARGETS.length - 1);
    expect(targets).toContainEqual({
      metric_key: "sleep.duration",
      unit: "min",
      minimum: 420,
    });
  });
});
