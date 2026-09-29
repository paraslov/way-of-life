import { describe, expect, it } from "vitest";
import { DEFAULT_TARGETS, DEFAULT_TARGETS_FROM } from "@/lib/seed";
import {
  activeTargets,
  summarizeWeek,
  type TargetRow,
  targetStatus,
  weekStart,
} from "./week";

// Monday 19 – Sunday 25 October 2026; "today" is Thursday the 22nd.
const TODAY = "2026-10-22";

const TARGETS: TargetRow[] = DEFAULT_TARGETS.map((t) => ({
  metric_key: t.metricKey,
  period: t.period,
  minimum: t.minimum,
  target_min: t.targetMin,
  target_max: t.targetMax,
  active_from: DEFAULT_TARGETS_FROM,
}));

const ORDER = DEFAULT_TARGETS.map((t) => t.metricKey);

function line(summary: ReturnType<typeof summarizeWeek>, key: string) {
  return summary.lines.find((l) => l.metricKey === key);
}

describe("weekStart", () => {
  it("returns the Monday", () => {
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(weekStart(TODAY)).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
  });
});

describe("targetStatus", () => {
  const target = { minimum: 150, targetMin: 250, targetMax: 400 };
  it.each([
    [null, "unknown"],
    [100, "below"],
    [150, "minimum"],
    [250, "target"],
    [400, "target"],
    [401, "above"],
  ] as const)("%s → %s", (fact, status) => {
    expect(targetStatus(fact, target)).toBe(status);
  });
});

describe("activeTargets", () => {
  it("takes the latest row per metric that is already active", () => {
    const rows: TargetRow[] = [
      { ...TARGETS[0], active_from: "2026-01-01", minimum: 150 },
      { ...TARGETS[0], active_from: "2026-10-01", minimum: 180 },
      { ...TARGETS[0], active_from: "2026-11-01", minimum: 200 },
    ];
    expect(activeTargets(rows, "2026-10-19").map((r) => r.minimum)).toEqual([
      180,
    ]);
  });
});

describe("summarizeWeek", () => {
  const summary = summarizeWeek({
    today: TODAY,
    targets: TARGETS,
    order: ORDER,
    activities: [
      { local_date: "2026-10-19", type: "strength", duration_min: 50 },
      { local_date: "2026-10-19", type: "power_balance", duration_min: 8 },
      { local_date: "2026-10-20", type: "easy_run", duration_min: 40 },
      { local_date: "2026-10-22", type: "intensity", duration_min: 45 },
      { local_date: "2026-10-22", type: "mobility", duration_min: 10 },
      // Previous week: not counted.
      { local_date: "2026-10-18", type: "trek", duration_min: 240 },
      { local_date: "2026-10-20", type: "walk_after_meal", duration_min: 20 },
    ],
    days: [
      { local_date: "2026-10-19", sleep_minutes: 400, steps: 9000, energy: 3 },
      { local_date: "2026-10-20", sleep_minutes: 440, steps: null, energy: 4 },
      { local_date: "2026-10-21", sleep_minutes: null, steps: 11000 },
    ],
    verdicts: [
      { local_date: "2026-10-19", verdict: "green" },
      { local_date: "2026-10-20", verdict: "yellow" },
      { local_date: "2026-10-22", verdict: "unknown" },
    ],
  });

  it("covers Monday to Sunday", () => {
    expect([summary.start, summary.end]).toEqual(["2026-10-19", "2026-10-25"]);
  });

  it("sums aerobic minutes of runs, intensity and treks in the week", () => {
    expect(line(summary, "aerobic.minutes")).toMatchObject({
      fact: 85,
      status: "below",
    });
  });

  it("counts sessions per type", () => {
    expect(line(summary, "intensity.sessions")?.fact).toBe(1);
    expect(line(summary, "strength.sessions")).toMatchObject({
      fact: 1,
      status: "minimum",
    });
    expect(line(summary, "power_balance.sessions")?.fact).toBe(1);
    expect(line(summary, "mobility.sessions")?.fact).toBe(1);
  });

  it("counts past days without training as rest, today only when logged", () => {
    // Wednesday had no training; today (Thursday) has no «rest» entry.
    expect(line(summary, "rest.days")?.fact).toBe(1);
  });

  it("averages daily metrics over days with a value", () => {
    expect(line(summary, "sleep.duration")).toMatchObject({
      fact: 420,
      status: "minimum",
    });
    expect(line(summary, "steps.daily")).toMatchObject({
      fact: 10000,
      status: "target",
    });
    expect(line(summary, "protein.daily")).toMatchObject({
      fact: null,
      status: "unknown",
    });
    expect(summary.energyAverage).toBe(3.5);
  });

  it("keeps the target order", () => {
    expect(summary.lines.map((l) => l.metricKey)).toEqual(ORDER);
  });

  it("colours each day by its verdict, empty when there was none", () => {
    expect(summary.days.map((d) => d.verdict)).toEqual([
      "green",
      "yellow",
      null,
      "unknown",
      null,
      null,
      null,
    ]);
    expect(summary.days[3]).toMatchObject({ isToday: true, isFuture: false });
    expect(summary.days[4].isFuture).toBe(true);
  });
});
