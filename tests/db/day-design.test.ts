import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { saveEveningFor } from "@/lib/db/evening";
import { loadTodayFor, saveCheckinFor } from "@/lib/db/today";
import { loadWeekFor } from "@/lib/db/week";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { CheckinInput } from "@/lib/today/checkin";
import { buildDraft } from "@/lib/today/draft";
import { previewDay } from "@/lib/today/preview";
import { adminClient, appClient, asUser, createTestUser } from "./helpers";

const DAY = "2026-10-19";
const checkin: CheckinInput = {
  sleepMinutes: 390,
  sleepScore: null,
  rhr: 52,
  hrvMs: null,
  hrvStatus: "balanced",
  energy: 3,
  desire: 2,
  legs: 3,
  redFlags: [],
  note: null,
  symptoms: [],
};

describe("design day data", () => {
  let admin: pg.Client;
  let app: pg.Client;
  let userId: string;
  const as = <T>(callback: (client: pg.PoolClient) => Promise<T>) =>
    asUser(app, userId, callback);

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

  it("uses the same rules for live preview and persisted verdict", async () => {
    const initial = await as((client) => loadTodayFor(client, userId, DAY));
    const boolSymptoms = initial.symptoms
      .filter((symptom) => symptom.scale === "bool")
      .map((symptom) => ({
        symptomId: symptom.id,
        severity: 0,
        atRest: false,
        heartRate: null,
      }));
    await as((client) =>
      saveCheckinFor(
        client,
        userId,
        DAY,
        { ...checkin, symptoms: boolSymptoms },
        DEFAULT_SETTINGS,
      ),
    );
    const view = await as((client) => loadTodayFor(client, userId, DAY));
    const preview = previewDay({
      date: DAY,
      draft: buildDraft(view),
      history: view.history,
      rhrStartBaseline: view.settings.rhrStartBaseline,
      weekTemplate: view.settings.weekTemplate,
      lastIntensityDate: view.lastIntensityDate,
      lthr: view.settings.lthr,
    });
    expect(preview.snapshot).toEqual(view.decision?.snapshot);
    expect(preview.recommendedAction).toBe(view.decision?.recommendedAction);
  });

  it("saves partial evening values without changing the morning snapshot", async () => {
    const before = (await as((client) => loadTodayFor(client, userId, DAY)))
      .decision?.snapshot;
    await as((client) =>
      saveEveningFor(client, userId, DAY, {
        steps: 0,
        walkAfterMeal: 0,
        proteinBand: "120_140",
        fiberBand: null,
        bedtimeTarget: null,
        decisionFit: "less",
        note: "После нагрузки устал",
      }),
    );
    const view = await as((client) => loadTodayFor(client, userId, DAY));
    expect(view.checkin?.steps).toBe(0);
    expect(view.evening).toMatchObject({
      walk_after_meal: 0,
      protein_band: "120_140",
      fiber_band: null,
      decision_fit: "less",
    });
    expect(view.decision?.snapshot).toEqual(before);
    await as((client) =>
      saveEveningFor(client, userId, DAY, {
        steps: null,
        walkAfterMeal: null,
        proteinBand: null,
        fiberBand: null,
        bedtimeTarget: null,
        decisionFit: null,
        note: null,
      }),
    );
    const cleared = await as((client) => loadTodayFor(client, userId, DAY));
    expect(cleared.checkin?.steps).toBeNull();
    expect(cleared.evening?.walk_after_meal).toBeNull();
  });

  it("shows saved plan and mode while retaining categorical evening bands", async () => {
    await as(async (client) => {
      await client.query(
        "INSERT INTO week_modes (user_id, week_start, mode) VALUES ($1, $2, 'travel')",
        [userId, DAY],
      );
      await client.query(
        "INSERT INTO day_evenings (user_id, local_date, protein_band) VALUES ($1, $2, '120_140') ON CONFLICT (user_id, local_date) DO UPDATE SET protein_band = EXCLUDED.protein_band",
        [userId, DAY],
      );
    });
    const week = await as((client) => loadWeekFor(client, userId, DAY));
    expect(week.mode).toBe("travel");
    expect(week.days[0]).toMatchObject({
      plannedSession: "strength_a",
      verdict: "yellow",
    });
    expect(
      week.lines.find((line) => line.metricKey === "protein.daily"),
    ).toMatchObject({ fact: null, band: "120_140", bandDays: 1 });
  });
});
