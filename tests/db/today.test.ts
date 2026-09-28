import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { shiftId } from "@/lib/date";
import {
  addActivityFor,
  chooseActionFor,
  loadTodayFor,
  saveCheckinFor,
  saveStepsFor,
} from "@/lib/db/today";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { CheckinInput } from "@/lib/today/checkin";
import { adminClient, appClient, asUser, createTestUser } from "./helpers";

// 2026-10-19 is a Monday (strength A), 2026-10-21 a Wednesday (intensity).
const MON = "2026-10-19";
const WED = "2026-10-21";

const EMPTY: CheckinInput = {
  sleepMinutes: null,
  sleepScore: null,
  rhr: null,
  hrvMs: null,
  hrvStatus: null,
  energy: null,
  desire: null,
  legs: null,
  note: null,
  redFlags: [],
  symptoms: [],
};

describe("today repository", () => {
  let admin: pg.Client;
  let app: pg.Client;
  let userId: string;

  const as = <T>(callback: (client: pg.PoolClient) => Promise<T>) =>
    asUser(app, userId, callback);
  const save = (date: string, input: Partial<CheckinInput>) =>
    as((client) =>
      saveCheckinFor(
        client,
        userId,
        date,
        { ...EMPTY, ...input },
        DEFAULT_SETTINGS,
      ),
    );
  const load = (date: string) =>
    as((client) => loadTodayFor(client, userId, date));

  beforeAll(async () => {
    admin = adminClient();
    app = appClient();
    await admin.connect();
    await app.connect();
  });

  beforeEach(async () => {
    if (userId) await admin.query("DELETE FROM users WHERE id = $1", [userId]);
    userId = await createTestUser(admin);
  });

  afterAll(async () => {
    await app.end();
    await admin.query("DELETE FROM users WHERE id = $1", [userId]);
    await admin.end();
  });

  it("starts empty with defaults seeded", async () => {
    const view = await load(MON);
    expect(view.checkin).toBeNull();
    expect(view.decision).toBeNull();
    expect(view.symptoms.filter((s) => s.pinned).map((s) => s.key)).toEqual([
      "knee",
      "thigh",
      "palpitations",
      "illness",
    ]);
  });

  it("saves a check-in and freezes the decision with its snapshot", async () => {
    const decision = await save(MON, { sleepMinutes: 330, rhr: 49 });
    expect(decision.recommendedAction).toBe("rest_or_walk");

    const view = await load(MON);
    expect(view.checkin).toMatchObject({ sleep_minutes: 330, rhr: 49 });
    expect(view.decision).toMatchObject({
      ruleVersion: "1.0",
      plannedSession: "strength_a",
      recommendedAction: "rest_or_walk",
      chosenAction: null,
    });
    expect(view.decision?.snapshot.light.verdict).toBe("red");
    expect(view.decision?.snapshot.light.rhrBaseline).toEqual({
      value: 48,
      basis: "start",
      n: 0,
    });
  });

  it("keeps a choice while the recommendation holds and clears it when it changes", async () => {
    await save(MON, { sleepMinutes: 330 });
    expect(await as((c) => chooseActionFor(c, MON, "accept", null))).toBe(true);
    await save(MON, { sleepMinutes: 340, note: "поздно лёг" });
    expect((await load(MON)).decision?.chosenAction).toBe("accept");

    await save(MON, { sleepMinutes: 450 });
    expect((await load(MON)).decision).toMatchObject({
      recommendedAction: "strength_a",
      chosenAction: null,
      customText: null,
    });
  });

  it("stores custom text only for a custom choice", async () => {
    await save(MON, { sleepMinutes: 450 });
    await as((c) => chooseActionFor(c, MON, "custom", "плавание 30 мин"));
    expect((await load(MON)).decision?.customText).toBe("плавание 30 мин");
    await as((c) => chooseActionFor(c, MON, "skip", "игнор"));
    expect((await load(MON)).decision).toMatchObject({
      chosenAction: "skip",
      customText: null,
    });
    expect(await as((c) => chooseActionFor(c, WED, "accept", null))).toBe(
      false,
    );
  });

  it("writes and removes symptom entries", async () => {
    const knee = (await load(MON)).symptoms.find((s) => s.key === "knee");
    if (!knee) throw new Error("knee not seeded");
    let decision = await save(MON, {
      sleepMinutes: 450,
      symptoms: [
        { symptomId: knee.id, severity: 5, atRest: false, heartRate: null },
      ],
    });
    expect(decision.snapshot.light.verdict).toBe("red");
    expect((await load(MON)).entries).toHaveLength(1);

    decision = await save(MON, {
      sleepMinutes: 450,
      symptoms: [
        { symptomId: knee.id, severity: null, atRest: false, heartRate: null },
      ],
    });
    expect(decision.snapshot.light.verdict).toBe("green");
    expect((await load(MON)).entries).toHaveLength(0);
  });

  it("uses the personal RHR baseline and multi-day history", async () => {
    for (let i = 1; i <= 14; i += 1) {
      await save(shiftId(MON, -i), { rhr: 44, legs: i <= 2 ? 1 : 3 });
    }
    const decision = await save(MON, { rhr: 48, legs: 2 });
    const light = decision.snapshot.light;
    expect(light.rhrBaseline).toEqual({ value: 44, basis: "personal", n: 14 });
    expect(light.signals.find((s) => s.key === "rhr")?.state).toBe("yellow");
    expect(light.signals.find((s) => s.key === "legs")?.state).toBe("red");
  });

  it("plans an easy run on Wednesday after a recent intensity", async () => {
    await as((c) =>
      addActivityFor(c, userId, shiftId(WED, -3), {
        type: "intensity",
        durationMin: 45,
        rpe: 8,
      }),
    );
    const decision = await save(WED, { sleepMinutes: 450 });
    expect(decision.plannedSession).toBe("easy_run");
    expect(decision.snapshot.plan.lastIntensityDate).toBe(shiftId(WED, -3));
  });

  it("keeps steps apart from the morning fields and the prefill", async () => {
    await save(shiftId(MON, -2), { sleepMinutes: 400, energy: 3 });
    await as((c) => saveStepsFor(c, userId, shiftId(MON, -1), 9000));
    await save(MON, { sleepMinutes: 450 });
    await as((c) => saveStepsFor(c, userId, MON, 11000));

    const view = await load(MON);
    expect(view.checkin).toMatchObject({ sleep_minutes: 450, steps: 11000 });
    expect(view.previous?.local_date).toBe(shiftId(MON, -2));
  });

  it("records red flags and lets them override", async () => {
    const decision = await save(MON, {
      sleepMinutes: 450,
      redFlags: ["chest_pain"],
    });
    expect(decision.recommendedAction).toBe("stop_see_doctor");
    expect((await load(MON)).checkin?.red_flags).toEqual(["chest_pain"]);
  });
});
