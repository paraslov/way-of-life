import { describe, expect, it } from "vitest";
import { shiftId } from "@/lib/date";
import { baseline, type DayValue, metricBaseline } from "./baseline";

const TODAY = "2026-10-20";

/** `values[0]` is yesterday, `values[1]` the day before, and so on. */
function history(values: (number | null)[]): DayValue[] {
  return values.map((value, index) => ({
    date: shiftId(TODAY, -(index + 1)),
    value,
  }));
}

const median = { strategy: "median", windowDays: 28, minPoints: 14 } as const;

describe("baseline", () => {
  it("returns null with fewer points than the minimum", () => {
    expect(
      baseline(history(Array(13).fill(48)), { ...median, today: TODAY }),
    ).toBeNull();
    expect(baseline([], { ...median, today: TODAY })).toBeNull();
  });

  it("takes the median and interquartile band once there are enough points", () => {
    const values = [46, 47, 47, 48, 48, 48, 48, 49, 49, 50, 50, 51, 52, 60];
    expect(baseline(history(values), { ...median, today: TODAY })).toEqual({
      value: 48.5,
      band: [48, 50],
      n: 14,
    });
  });

  it("excludes today by default and can include it", () => {
    const series = [...history(Array(14).fill(48)), { date: TODAY, value: 90 }];
    expect(baseline(series, { ...median, today: TODAY })?.value).toBe(48);
    expect(
      baseline(series, { ...median, today: TODAY, excludeToday: false })?.n,
    ).toBe(15);
  });

  it("ignores days outside the window and in the future", () => {
    const series = [
      ...history(Array(14).fill(50)),
      { date: shiftId(TODAY, -29), value: 30 },
      { date: shiftId(TODAY, 1), value: 99 },
    ];
    expect(baseline(series, { ...median, today: TODAY })).toMatchObject({
      value: 50,
      n: 14,
    });
  });

  it("tolerates gaps: missing and empty days just are not counted", () => {
    const values = Array.from({ length: 28 }, (_, i) =>
      i % 2 === 0 ? 48 : null,
    );
    expect(baseline(history(values), { ...median, today: TODAY })).toEqual({
      value: 48,
      band: [48, 48],
      n: 14,
    });
  });

  it("keeps one value per day", () => {
    const day = shiftId(TODAY, -1);
    const series = [
      ...history([null, ...Array(13).fill(48)]),
      { date: day, value: 40 },
      { date: day, value: 48 },
    ];
    expect(baseline(series, { ...median, today: TODAY })?.n).toBe(14);
  });

  it("computes a mean with a one-SD band", () => {
    expect(
      baseline(history([400, 420, 440, 400, 440]), {
        strategy: "mean",
        windowDays: 7,
        minPoints: 5,
        today: TODAY,
      }),
    ).toEqual({ value: 420, band: [402.1, 437.9], n: 5 });
  });

  it("uses the registry spec for a metric", () => {
    expect(
      metricBaseline("rhr.daily", history(Array(13).fill(48)), TODAY),
    ).toBeNull();
    expect(
      metricBaseline("rhr.daily", history(Array(20).fill(49)), TODAY)?.value,
    ).toBe(49);
    expect(metricBaseline("sleep.score", history([80]), TODAY)).toBeNull();
  });
});
