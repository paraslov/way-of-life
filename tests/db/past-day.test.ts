import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shiftId } from "@/lib/date";
import { loadJournalFor } from "@/lib/db/journal";
import {
  loadTodayFor,
  saveCheckinFor,
  saveLateCheckinFor,
} from "@/lib/db/today";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { CheckinInput } from "@/lib/today/checkin";
import { adminClient, appClient, asUser, createTestUser } from "./helpers";

const TODAY = "2026-10-22";
const DECIDED = shiftId(TODAY, -2);
const MISSED = shiftId(TODAY, -3);

const morning: CheckinInput = {
  sleepMinutes: 450,
  sleepScore: null,
  rhr: 48,
  hrvMs: null,
  hrvStatus: "balanced",
  energy: 7,
  desire: 3,
  legs: 3,
  redFlags: [],
  note: null,
  symptoms: [],
};

describe("filling in a finished day (D27)", () => {
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
    await as((client) => loadTodayFor(client, userId, TODAY));
  });
  afterAll(async () => {
    await app.end();
    await admin.query("DELETE FROM users WHERE id = $1", [userId]);
    await admin.end();
  });

  it("corrects a decided morning without touching its decision", async () => {
    await as((client) =>
      saveCheckinFor(
        client,
        userId,
        DECIDED,
        { ...morning, redFlags: ["chest_pain"] },
        DEFAULT_SETTINGS,
      ),
    );
    const before = await as((client) => loadTodayFor(client, userId, DECIDED));

    await as((client) =>
      saveLateCheckinFor(client, userId, DECIDED, {
        ...morning,
        sleepMinutes: 330,
      }),
    );
    const after = await as((client) => loadTodayFor(client, userId, DECIDED));
    expect(after.checkin?.sleep_minutes).toBe(330);
    expect(after.checkin?.red_flags).toEqual(["chest_pain"]);
    expect(after.decision).toEqual(before.decision);

    const journal = await as((client) => loadJournalFor(client, TODAY, 30, 48));
    const day = journal.find((entry) => entry.date === DECIDED);
    expect(day?.verdict).toBe(before.decision?.snapshot.light.verdict);
    expect(day?.late?.kind).toBe("corrected");
    expect(day?.late?.light.verdict).toBe("red");
    expect(day?.editable).toBe(true);
  });

  it("fills in a missed morning without creating a decision", async () => {
    await as((client) => saveLateCheckinFor(client, userId, MISSED, morning));
    const view = await as((client) => loadTodayFor(client, userId, MISSED));
    expect(view.checkin?.energy).toBe(7);
    expect(view.decision).toBeNull();

    const journal = await as((client) => loadJournalFor(client, TODAY, 30, 48));
    const day = journal.find((entry) => entry.date === MISSED);
    expect(day?.recommendedAction).toBeNull();
    expect(day?.late?.kind).toBe("filled");
    expect(day?.verdict).toBe("green");
    expect(journal.find((entry) => entry.date === TODAY)?.editable).toBe(false);
  });
});
