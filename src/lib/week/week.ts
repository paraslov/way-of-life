import type { ActivityType } from "@/lib/activities";
import { idToDate, shiftId } from "@/lib/date";
import type { LightState } from "@/lib/light/light";
import type { MetricKey } from "@/lib/metrics/registry";

/**
 * The simple week (02.12): the facts of the current Monday–Sunday against the
 * active targets, and the verdict of each day. Pure; the repository supplies
 * the rows. Weekly targets sum over the week, daily ones use the mean of the
 * days that have a value.
 */

export type TargetRow = {
  metric_key: string;
  period: "day" | "week";
  minimum: number;
  target_min: number;
  target_max: number;
  active_from: string;
};

export type WeekActivity = {
  local_date: string;
  type: ActivityType;
  duration_min: number | null;
};
export type WeekDay = {
  local_date: string;
  sleep_minutes: number | null;
  steps: number | null;
};
export type WeekVerdict = { local_date: string; verdict: LightState };

export type TargetStatus = "unknown" | "below" | "minimum" | "target" | "above";

export type TargetLine = {
  metricKey: MetricKey;
  period: "day" | "week";
  fact: number | null;
  minimum: number;
  targetMin: number;
  targetMax: number;
  status: TargetStatus;
};

export type DayCell = {
  date: string;
  verdict: LightState | null;
  isToday: boolean;
  isFuture: boolean;
};

export type WeekSummary = {
  start: string;
  end: string;
  lines: TargetLine[];
  days: DayCell[];
};

/** Minutes of these count as aerobic (Z2 and above). */
const AEROBIC: readonly ActivityType[] = ["easy_run", "intensity", "trek"];
const TRAINING: readonly ActivityType[] = [
  "easy_run",
  "intensity",
  "strength",
  "strength_lite",
  "power_balance",
  "trek",
];

const SESSION_TYPES: Partial<Record<MetricKey, readonly ActivityType[]>> = {
  "intensity.sessions": ["intensity"],
  "strength.sessions": ["strength", "strength_lite"],
  "power_balance.sessions": ["power_balance"],
  "mobility.sessions": ["mobility"],
};

/** Monday of the week that `date` falls in. */
export function weekStart(date: string): string {
  return shiftId(date, -((idToDate(date).getUTCDay() + 6) % 7));
}

function mean(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return Math.round(
    known.reduce((sum, value) => sum + value, 0) / known.length,
  );
}

export function targetStatus(
  fact: number | null,
  target: { minimum: number; targetMin: number; targetMax: number },
): TargetStatus {
  if (fact === null) return "unknown";
  if (fact < target.minimum) return "below";
  if (fact < target.targetMin) return "minimum";
  if (fact <= target.targetMax) return "target";
  return "above";
}

/** For each metric, the target row with the latest `active_from` on or before `on`. */
export function activeTargets(
  rows: readonly TargetRow[],
  on: string,
): TargetRow[] {
  const latest = new Map<string, TargetRow>();
  for (const row of rows) {
    if (row.active_from > on) continue;
    const current = latest.get(row.metric_key);
    if (!current || row.active_from > current.active_from) {
      latest.set(row.metric_key, row);
    }
  }
  return [...latest.values()];
}

function fact(
  key: string,
  today: string,
  start: string,
  activities: readonly WeekActivity[],
  days: readonly WeekDay[],
): number | null {
  const sessions = SESSION_TYPES[key as MetricKey];
  if (sessions) {
    return activities.filter((a) => sessions.includes(a.type)).length;
  }
  switch (key) {
    case "aerobic.minutes":
      return activities
        .filter((a) => AEROBIC.includes(a.type))
        .reduce((sum, a) => sum + (a.duration_min ?? 0), 0);
    case "rest.days": {
      // A past day without training is a rest day; today only once logged.
      let count = 0;
      for (let day = start; day <= today; day = shiftId(day, 1)) {
        const onDay = activities.filter((a) => a.local_date === day);
        const rested =
          day === today
            ? onDay.some((a) => a.type === "rest")
            : !onDay.some((a) => TRAINING.includes(a.type));
        if (rested) count += 1;
      }
      return count;
    }
    case "steps.daily":
      return mean(days.map((d) => d.steps));
    case "sleep.duration":
      return mean(days.map((d) => d.sleep_minutes));
    default:
      // Protein and fiber are not logged yet.
      return null;
  }
}

export function summarizeWeek(input: {
  today: string;
  targets: readonly TargetRow[];
  activities: readonly WeekActivity[];
  days: readonly WeekDay[];
  verdicts: readonly WeekVerdict[];
  /** Display order of the metrics. */
  order: readonly MetricKey[];
}): WeekSummary {
  const start = weekStart(input.today);
  const end = shiftId(start, 6);
  const inWeek = <T extends { local_date: string }>(rows: readonly T[]) =>
    rows.filter((row) => row.local_date >= start && row.local_date <= end);
  const activities = inWeek(input.activities);
  const days = inWeek(input.days);

  const lines = activeTargets(input.targets, start)
    .filter((row): row is TargetRow & { metric_key: MetricKey } =>
      input.order.includes(row.metric_key as MetricKey),
    )
    .sort(
      (a, b) =>
        input.order.indexOf(a.metric_key) - input.order.indexOf(b.metric_key),
    )
    .map((row): TargetLine => {
      const value = fact(row.metric_key, input.today, start, activities, days);
      const target = {
        minimum: Number(row.minimum),
        targetMin: Number(row.target_min),
        targetMax: Number(row.target_max),
      };
      return {
        metricKey: row.metric_key,
        period: row.period,
        fact: value,
        ...target,
        status: targetStatus(value, target),
      };
    });

  const verdicts = new Map(
    input.verdicts.map((v) => [v.local_date, v.verdict]),
  );
  const cells = Array.from({ length: 7 }, (_, index): DayCell => {
    const date = shiftId(start, index);
    return {
      date,
      verdict: verdicts.get(date) ?? null,
      isToday: date === input.today,
      isFuture: date > input.today,
    };
  });

  return { start, end, lines, days: cells };
}
