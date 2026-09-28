import { describe, expect, it } from "vitest";
import ru from "@/i18n/messages/ru.json";
import {
  CHECKIN_COLUMNS,
  CHECKIN_METRICS,
  getMetric,
  inRange,
  isMetricKey,
  METRIC_KEYS,
} from "./registry";

function label(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      ru.metrics,
    );
}

describe("metric registry", () => {
  it("names every metric in the ru catalog", () => {
    for (const key of METRIC_KEYS) {
      expect(typeof label(key), key).toBe("string");
    }
  });

  it("maps each check-in column to exactly one metric", () => {
    const columns = CHECKIN_METRICS.map((key) => getMetric(key).checkinColumn);
    expect([...columns].sort()).toEqual([...CHECKIN_COLUMNS].sort());
  });

  it("keeps every baseline window able to reach its minimum", () => {
    for (const key of METRIC_KEYS) {
      const baseline = getMetric(key).baseline;
      if (baseline) {
        expect(baseline.minPoints, key).toBeLessThanOrEqual(
          baseline.windowDays,
        );
      }
    }
  });

  it("follows rules-v1: RHR median over 28 days, 14 points", () => {
    expect(getMetric("rhr.daily").baseline).toEqual({
      strategy: "median",
      windowDays: 28,
      minPoints: 14,
    });
  });

  it("validates keys and ranges", () => {
    expect(isMetricKey("sleep.duration")).toBe(true);
    expect(isMetricKey("toString")).toBe(false);
    expect(inRange("energy.morning", 5)).toBe(true);
    expect(inRange("energy.morning", 6)).toBe(false);
    expect(inRange("aerobic.minutes", 9999)).toBe(true);
  });
});
