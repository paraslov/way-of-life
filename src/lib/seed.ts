import type { MetricKey } from "@/lib/metrics/registry";

/**
 * Starting rows for a user, from docs/content/defaults.md. They are written
 * once (and again after «Удалить все данные») by `ensureUserDefaults`; the
 * user's own edits are never overwritten.
 */

export type SymptomScale = "0_10" | "bool";

export type SymptomSeed = {
  key: string;
  name: string;
  scale: SymptomScale;
  pinned: boolean;
};

export const DEFAULT_SYMPTOMS: readonly SymptomSeed[] = [
  { key: "knee", name: "Колено", scale: "0_10", pinned: true },
  { key: "thigh", name: "Бедро (rectus femoris)", scale: "0_10", pinned: true },
  { key: "palpitations", name: "Перебои", scale: "bool", pinned: true },
  { key: "illness", name: "Признаки болезни", scale: "bool", pinned: true },
  { key: "reflux", name: "Рефлюкс", scale: "0_10", pinned: false },
  { key: "abdomen", name: "Живот", scale: "0_10", pinned: false },
  { key: "calf", name: "Икра", scale: "0_10", pinned: false },
];

export type TargetSeed = {
  metricKey: MetricKey;
  period: "day" | "week";
  minimum: number;
  targetMin: number;
  targetMax: number;
};

/**
 * `day` targets are compared with the weekly mean of daily values. Strength
 * «1 + 1 Lite» counts as a minimum of 1; intensity «1 per 7–10 days» is
 * tracked per week until the gate says otherwise.
 */
export const DEFAULT_TARGETS: readonly TargetSeed[] = [
  {
    metricKey: "aerobic.minutes",
    period: "week",
    minimum: 150,
    targetMin: 250,
    targetMax: 400,
  },
  {
    metricKey: "intensity.sessions",
    period: "week",
    minimum: 0,
    targetMin: 1,
    targetMax: 1,
  },
  {
    metricKey: "strength.sessions",
    period: "week",
    minimum: 1,
    targetMin: 2,
    targetMax: 2,
  },
  {
    metricKey: "power_balance.sessions",
    period: "week",
    minimum: 2,
    targetMin: 2,
    targetMax: 2,
  },
  {
    metricKey: "mobility.sessions",
    period: "week",
    minimum: 3,
    targetMin: 3,
    targetMax: 6,
  },
  {
    metricKey: "rest.days",
    period: "week",
    minimum: 1,
    targetMin: 1,
    targetMax: 1,
  },
  {
    metricKey: "steps.daily",
    period: "day",
    minimum: 7000,
    targetMin: 8000,
    targetMax: 12000,
  },
  {
    metricKey: "sleep.duration",
    period: "day",
    minimum: 420,
    targetMin: 450,
    targetMax: 480,
  },
  {
    metricKey: "protein.daily",
    period: "day",
    minimum: 105,
    targetMin: 120,
    targetMax: 140,
  },
  {
    metricKey: "fiber.daily",
    period: "day",
    minimum: 20,
    targetMin: 25,
    targetMax: 35,
  },
];

/** Seeded targets apply from here, so earlier weeks are measured too. */
export const DEFAULT_TARGETS_FROM = "2026-01-01";
