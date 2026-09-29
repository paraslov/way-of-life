import { describe, expect, it } from "vitest";
import { adviseDeload } from "./context";
import type { WeekSummary } from "./week";

function summary(
  states: ("green" | "yellow" | "red" | "unknown" | null)[],
  sleep: number | null,
): WeekSummary {
  return {
    start: "2026-10-19",
    end: "2026-10-25",
    energyAverage: null,
    days: states.map((verdict, index) => ({
      date: `2026-10-${19 + index}`,
      verdict,
      isToday: index === states.length - 1,
      isFuture: false,
    })),
    lines: [
      {
        metricKey: "sleep.duration",
        period: "day",
        fact: sleep,
        minimum: 420,
        targetMin: 450,
        targetMax: 480,
        status: "below",
      },
    ],
  };
}

describe("deload suggestion", () => {
  it("observes sparse or missing data", () => {
    expect(adviseDeload(summary(["yellow", null], 390)).level).toBe("observe");
  });
  it("suggests reducing after accumulated non-green days", () => {
    expect(
      adviseDeload(summary(["yellow", "yellow", "yellow"], 430)).level,
    ).toBe("reduce");
  });
  it("suggests full recovery after two red days", () => {
    expect(adviseDeload(summary(["red", "green", "red"], 450)).level).toBe(
      "recover",
    );
  });
});
