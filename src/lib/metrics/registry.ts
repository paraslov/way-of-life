/**
 * Metric registry (architecture §3): the metadata of every metric lives here,
 * in code, not in a database table. Values are stored in the typed tables in
 * the canonical `unit`; the display name is `metrics.<key>` in the ru catalog.
 *
 * v0 covers the morning check-in and the weekly targets of
 * docs/content/defaults.md. Traffic-light rules live in `src/lib/light`.
 */

export type MetricDomain =
  | "recovery"
  | "aerobic"
  | "strength"
  | "mobility"
  | "body"
  | "medical"
  | "habits"
  | "subjective";

export type MetricSource = "manual" | "garmin" | "lab" | "test" | "cpet";

export type MetricUnit =
  | "min"
  | "bpm"
  | "ms"
  | "points"
  | "scale"
  | "status"
  | "sessions"
  | "steps"
  | "g"
  | "days";

export type BaselineSpec = {
  strategy: "median" | "mean";
  /** Trailing window in days, today excluded. */
  windowDays: number;
  /** Fewer points than this and there is no personal baseline yet. */
  minPoints: number;
};

export type MetricDefinition = {
  unit: MetricUnit;
  domain: MetricDomain;
  frequency: "daily" | "weekly";
  /** Accepted sources, in display priority: manual beats a device (§4). */
  sources: readonly MetricSource[];
  /** Inclusive bounds of a plausible value, for input validation. */
  range?: readonly [number, number];
  /** The `daily_checkins` column that stores it, for check-in metrics. */
  checkinColumn?: CheckinColumn;
  baseline?: BaselineSpec;
};

export const CHECKIN_COLUMNS = [
  "sleep_minutes",
  "sleep_score",
  "rhr",
  "hrv_ms",
  "hrv_status",
  "energy",
  "desire",
  "legs",
] as const;

export type CheckinColumn = (typeof CHECKIN_COLUMNS)[number];

/** Garmin HRV status values, best first. */
export const HRV_STATUSES = ["balanced", "unbalanced", "low", "poor"] as const;
export type HrvStatus = (typeof HRV_STATUSES)[number];

export const METRICS = {
  "sleep.duration": {
    unit: "min",
    domain: "recovery",
    frequency: "daily",
    sources: ["manual", "garmin"],
    range: [0, 1080],
    checkinColumn: "sleep_minutes",
    baseline: { strategy: "mean", windowDays: 7, minPoints: 5 },
  },
  "sleep.score": {
    unit: "points",
    domain: "recovery",
    frequency: "daily",
    sources: ["manual", "garmin"],
    range: [0, 100],
    checkinColumn: "sleep_score",
  },
  "rhr.daily": {
    unit: "bpm",
    domain: "recovery",
    frequency: "daily",
    sources: ["manual", "garmin"],
    range: [30, 120],
    checkinColumn: "rhr",
    baseline: { strategy: "median", windowDays: 28, minPoints: 14 },
  },
  "hrv.nightly": {
    unit: "ms",
    domain: "recovery",
    frequency: "daily",
    sources: ["manual", "garmin"],
    range: [5, 250],
    checkinColumn: "hrv_ms",
    baseline: { strategy: "median", windowDays: 28, minPoints: 14 },
  },
  "hrv.status": {
    unit: "status",
    domain: "recovery",
    frequency: "daily",
    sources: ["manual", "garmin"],
    checkinColumn: "hrv_status",
  },
  "energy.morning": {
    unit: "scale",
    domain: "subjective",
    frequency: "daily",
    sources: ["manual"],
    range: [1, 10],
    checkinColumn: "energy",
    baseline: { strategy: "median", windowDays: 14, minPoints: 7 },
  },
  "desire.morning": {
    unit: "scale",
    domain: "subjective",
    frequency: "daily",
    sources: ["manual"],
    range: [1, 3],
    checkinColumn: "desire",
  },
  "legs.morning": {
    unit: "scale",
    domain: "subjective",
    frequency: "daily",
    sources: ["manual"],
    range: [1, 3],
    checkinColumn: "legs",
  },
  "aerobic.minutes": {
    unit: "min",
    domain: "aerobic",
    frequency: "weekly",
    sources: ["manual", "garmin"],
  },
  "intensity.sessions": {
    unit: "sessions",
    domain: "aerobic",
    frequency: "weekly",
    sources: ["manual", "garmin"],
  },
  "strength.sessions": {
    unit: "sessions",
    domain: "strength",
    frequency: "weekly",
    sources: ["manual"],
  },
  "power_balance.sessions": {
    unit: "sessions",
    domain: "strength",
    frequency: "weekly",
    sources: ["manual"],
  },
  "mobility.sessions": {
    unit: "sessions",
    domain: "mobility",
    frequency: "weekly",
    sources: ["manual"],
  },
  "rest.days": {
    unit: "days",
    domain: "recovery",
    frequency: "weekly",
    sources: ["manual"],
  },
  "steps.daily": {
    unit: "steps",
    domain: "habits",
    frequency: "daily",
    sources: ["manual", "garmin"],
    range: [0, 100_000],
  },
  "protein.daily": {
    unit: "g",
    domain: "habits",
    frequency: "daily",
    sources: ["manual"],
    range: [0, 500],
  },
  "fiber.daily": {
    unit: "g",
    domain: "habits",
    frequency: "daily",
    sources: ["manual"],
    range: [0, 200],
  },
} as const satisfies Record<string, MetricDefinition>;

export type MetricKey = keyof typeof METRICS;

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export function isMetricKey(value: string): value is MetricKey {
  return Object.hasOwn(METRICS, value);
}

export function getMetric(key: MetricKey): MetricDefinition {
  return METRICS[key];
}

/** True when `value` is within the metric's plausible range (if it has one). */
export function inRange(key: MetricKey, value: number): boolean {
  const range = getMetric(key).range;
  return !range || (value >= range[0] && value <= range[1]);
}

/** The metrics entered in the morning check-in, in form order. */
export const CHECKIN_METRICS = METRIC_KEYS.filter(
  (key) => getMetric(key).checkinColumn,
);
