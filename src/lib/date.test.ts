import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE,
  daysBetween,
  formatDayTitle,
  normalizeTimeZone,
  shiftId,
  zonedDayId,
} from "./date";

describe("day ids", () => {
  it("resolves the calendar day in the user's zone, not UTC", () => {
    // 20:30 UTC on 28 Sep is already 29 Sep in Almaty (UTC+5).
    const instant = new Date("2026-09-28T20:30:00Z");
    expect(zonedDayId(instant, "UTC")).toBe("2026-09-28");
    expect(zonedDayId(instant, "Asia/Almaty")).toBe("2026-09-29");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftId("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftId("2027-01-01", -1)).toBe("2026-12-31");
    expect(daysBetween("2026-10-07", "2026-09-28")).toBe(9);
  });

  it("falls back to Almaty for unknown zones", () => {
    expect(normalizeTimeZone("Mars/Olympus")).toBe(DEFAULT_TIMEZONE);
    expect(normalizeTimeZone("Europe/Berlin")).toBe("Europe/Berlin");
  });

  it("formats a Russian day title", () => {
    expect(formatDayTitle("2026-09-28")).toBe("понедельник, 28 сентября");
  });
});
