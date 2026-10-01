import { z } from "zod";
import { RED_FLAGS } from "@/lib/decision/decision";
import type { DayObservations, SymptomReading } from "@/lib/light/light";
import {
  getMetric,
  HRV_STATUSES,
  type MetricKey,
} from "@/lib/metrics/registry";

/**
 * The morning check-in: its validated input, the database row shapes, and the
 * mapping of rows onto the observations the traffic light reads.
 */

function metricField(key: MetricKey) {
  const [min, max] = getMetric(key).range ?? [0, Number.MAX_SAFE_INTEGER];
  return z.number().int().min(min).max(max).nullable();
}

export const checkinSymptomSchema = z.object({
  symptomId: z.uuid(),
  /** null = not entered today: any saved entry for the day is removed. */
  severity: z.number().int().min(0).max(10).nullable(),
  atRest: z.boolean(),
  heartRate: z.number().int().min(30).max(230).nullable(),
});

export const checkinSchema = z.object({
  sleepMinutes: metricField("sleep.duration"),
  sleepScore: metricField("sleep.score"),
  rhr: metricField("rhr.daily"),
  hrvMs: metricField("hrv.nightly"),
  hrvStatus: z.enum(HRV_STATUSES).nullable(),
  energy: metricField("energy.morning"),
  desire: metricField("desire.morning"),
  legs: metricField("legs.morning"),
  note: z.string().trim().max(2000).nullable(),
  redFlags: z.array(z.enum(RED_FLAGS)).max(RED_FLAGS.length),
  symptoms: z.array(checkinSymptomSchema).max(50),
});

export type CheckinInput = z.infer<typeof checkinSchema>;

/** `7:05`, `7.05`, `7,05`, `705` or `7` hours → minutes. */
export function parseHoursMinutes(value: string): number | null | undefined {
  const text = value.trim();
  if (text === "") return null;
  const match = /^(\d{1,2})(?:[:.,]?(\d{2}))?$/.exec(text);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (minutes > 59) return undefined;
  return hours * 60 + minutes;
}

/** 425 → `7:05`. */
export function formatHoursMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export type CheckinRow = {
  local_date: string;
  sleep_minutes: number | null;
  sleep_score: number | null;
  rhr: number | null;
  hrv_ms: number | null;
  hrv_status: DayObservations["hrvStatus"];
  energy: number | null;
  desire: number | null;
  legs: number | null;
  steps: number | null;
  red_flags: string[];
  note: string | null;
};

export type SymptomEntryRow = {
  local_date: string;
  symptom_id: string;
  key: string;
  severity: number;
  context: "rest" | "exercise" | null;
  heart_rate: number | null;
};

const LIGHT_SYMPTOMS = ["knee", "thigh", "palpitations", "illness"] as const;

export function toObservations(
  date: string,
  row: CheckinRow | undefined,
  entries: readonly SymptomEntryRow[],
): DayObservations {
  const symptoms: DayObservations["symptoms"] = {};
  for (const entry of entries) {
    if (entry.local_date !== date) continue;
    const key = LIGHT_SYMPTOMS.find((known) => known === entry.key);
    if (!key) continue;
    const reading: SymptomReading = {
      severity: entry.severity,
      atRest: entry.context === "rest",
    };
    symptoms[key] = reading;
  }
  return {
    date,
    sleepMinutes: row?.sleep_minutes ?? null,
    rhr: row?.rhr ?? null,
    hrvStatus: row?.hrv_status ?? null,
    desire: row?.desire ?? null,
    legs: row?.legs ?? null,
    energy: row?.energy ?? null,
    symptoms,
  };
}
