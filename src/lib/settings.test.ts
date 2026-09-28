import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, heartRateZones, resolveSettings } from "./settings";

describe("heartRateZones", () => {
  it("reproduces the v5 table at LTHR 162", () => {
    expect(heartRateZones(162)).toEqual([
      { zone: 1, min: null, max: 137 },
      { zone: 2, min: 138, max: 148 },
      { zone: 3, min: 149, max: 154 },
      { zone: 4, min: 155, max: 162 },
      { zone: 5, min: 163, max: null },
    ]);
  });

  it("matches docs/content/defaults.md at LTHR 165", () => {
    expect(heartRateZones(165)).toEqual([
      { zone: 1, min: null, max: 139 },
      { zone: 2, min: 140, max: 151 },
      { zone: 3, min: 152, max: 157 },
      { zone: 4, min: 158, max: 165 },
      { zone: 5, min: 166, max: null },
    ]);
  });
});

describe("resolveSettings", () => {
  it("uses defaults for an empty bag", () => {
    expect(resolveSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid keys and drops invalid ones individually", () => {
    expect(
      resolveSettings({ lthr: 170, hrMax: "fast", timezone: "Mars/Base" }),
    ).toEqual({ ...DEFAULT_SETTINGS, lthr: 170 });
  });

  it("falls back to defaults when valid keys contradict each other", () => {
    expect(resolveSettings({ proteinMinG: 200, proteinMaxG: 150 })).toEqual(
      DEFAULT_SETTINGS,
    );
  });
});

describe("stage 02 defaults", () => {
  it("starts RHR at 48 and uses the rules-v1 week", () => {
    expect(DEFAULT_SETTINGS.rhrStartBaseline).toBe(48);
    expect(DEFAULT_SETTINGS.weekTemplate[2]).toBe("intensity");
    expect(DEFAULT_SETTINGS.weekTemplate[6]).toBe("rest");
  });

  it("drops a week template of the wrong length", () => {
    expect(
      resolveSettings({ weekTemplate: ["rest", "rest"] }).weekTemplate,
    ).toEqual(DEFAULT_SETTINGS.weekTemplate);
  });
});
