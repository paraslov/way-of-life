import { describe, expect, it } from "vitest";
import { isMetricKey } from "@/lib/metrics/registry";
import { DEFAULT_SYMPTOMS, DEFAULT_TARGETS } from "./seed";

describe("seed data", () => {
  it("uses registry keys and ordered target ranges", () => {
    for (const target of DEFAULT_TARGETS) {
      expect(isMetricKey(target.metricKey), target.metricKey).toBe(true);
      expect(target.minimum).toBeLessThanOrEqual(target.targetMin);
      expect(target.targetMin).toBeLessThanOrEqual(target.targetMax);
    }
    expect(new Set(DEFAULT_TARGETS.map((t) => t.metricKey)).size).toBe(
      DEFAULT_TARGETS.length,
    );
  });

  it("keeps symptom keys unique and valid for the database check", () => {
    const keys = DEFAULT_SYMPTOMS.map((symptom) => symptom.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
  });
});
