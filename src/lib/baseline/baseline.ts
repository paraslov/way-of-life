import { daysBetween } from "@/lib/date";
import { getMetric, type MetricKey } from "@/lib/metrics/registry";

/**
 * Baseline engine (architecture §5): pure functions over a day series. A
 * personal baseline exists only once the window holds `minPoints` values;
 * until then callers fall back to the starting thresholds and say so.
 */

export type DayValue = { date: string; value: number | null };

export type BaselineOptions = {
  strategy: "median" | "mean";
  /** Days counted back from `today`. */
  windowDays: number;
  minPoints: number;
  /** `YYYY-MM-DD` day id in the user's zone. */
  today: string;
  /** Default true: today's value is judged against the past, not itself. */
  excludeToday?: boolean;
};

export type Baseline = {
  value: number;
  /** Interquartile range for a median, mean ± 1 SD for a mean. */
  band: [number, number];
  n: number;
};

function quantile(sorted: number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

/** The values inside the window, one per day (a later entry for a day wins). */
export function windowValues(
  series: readonly DayValue[],
  { windowDays, today, excludeToday = true }: BaselineOptions,
): number[] {
  const newest = excludeToday ? 1 : 0;
  const oldest = excludeToday ? windowDays : windowDays - 1;
  const byDay = new Map<string, number>();
  for (const point of series) {
    if (point.value === null || !Number.isFinite(point.value)) continue;
    const age = daysBetween(today, point.date);
    if (age >= newest && age <= oldest) byDay.set(point.date, point.value);
  }
  return [...byDay.values()];
}

export function baseline(
  series: readonly DayValue[],
  options: BaselineOptions,
): Baseline | null {
  const values = windowValues(series, options);
  if (values.length === 0 || values.length < options.minPoints) return null;

  if (options.strategy === "median") {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      value: round(quantile(sorted, 0.5)),
      band: [round(quantile(sorted, 0.25)), round(quantile(sorted, 0.75))],
      n: values.length,
    };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  return {
    value: round(mean),
    band: [round(mean - sd), round(mean + sd)],
    n: values.length,
  };
}

/** The baseline of a registry metric with its own strategy and window. */
export function metricBaseline(
  key: MetricKey,
  series: readonly DayValue[],
  today: string,
): Baseline | null {
  const spec = getMetric(key).baseline;
  if (!spec) return null;
  return baseline(series, { ...spec, today });
}
