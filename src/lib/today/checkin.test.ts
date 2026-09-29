import { describe, expect, it } from "vitest";
import {
  checkinSchema,
  formatHoursMinutes,
  parseHoursMinutes,
  toObservations,
} from "./checkin";

describe("hours and minutes", () => {
  it.each([
    ["7:05", 425],
    ["601", 361],
    ["7.30", 450],
    ["6,05", 365],
    ["8", 480],
    [" 5:52 ", 352],
    ["", null],
  ])("parses %j", (text, minutes) => {
    expect(parseHoursMinutes(text)).toBe(minutes);
  });

  it.each(["7:75", "6,5", "abc", "7:05:00", "-1"])("rejects %j", (text) => {
    expect(parseHoursMinutes(text)).toBeUndefined();
  });

  it("formats back", () => {
    expect(formatHoursMinutes(425)).toBe("7:05");
    expect(formatHoursMinutes(352)).toBe("5:52");
  });
});

describe("checkinSchema", () => {
  const empty = {
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

  it("accepts an all-empty check-in", () => {
    expect(checkinSchema.safeParse(empty).success).toBe(true);
  });

  it("rejects values outside the registry ranges and unknown flags", () => {
    expect(checkinSchema.safeParse({ ...empty, energy: 6 }).success).toBe(
      false,
    );
    expect(checkinSchema.safeParse({ ...empty, rhr: Number.NaN }).success).toBe(
      false,
    );
    expect(
      checkinSchema.safeParse({ ...empty, redFlags: ["headache"] }).success,
    ).toBe(false);
  });
});

describe("toObservations", () => {
  it("maps light symptoms of the day and leaves the rest unknown", () => {
    const observations = toObservations(
      "2026-10-19",
      {
        local_date: "2026-10-19",
        sleep_minutes: 430,
        sleep_score: null,
        rhr: 47,
        hrv_ms: null,
        hrv_status: "balanced",
        energy: 4,
        desire: 3,
        legs: 2,
        steps: null,
        red_flags: [],
        note: null,
      },
      [
        {
          local_date: "2026-10-19",
          symptom_id: "a",
          key: "knee",
          severity: 3,
          context: "rest",
          heart_rate: null,
        },
        {
          local_date: "2026-10-19",
          symptom_id: "b",
          key: "reflux",
          severity: 5,
          context: null,
          heart_rate: null,
        },
        {
          local_date: "2026-10-18",
          symptom_id: "c",
          key: "thigh",
          severity: 5,
          context: null,
          heart_rate: null,
        },
      ],
    );
    expect(observations).toEqual({
      date: "2026-10-19",
      sleepMinutes: 430,
      rhr: 47,
      hrvStatus: "balanced",
      desire: 3,
      legs: 2,
      energy: 4,
      symptoms: { knee: { severity: 3, atRest: true } },
    });
  });
});
