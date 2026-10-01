import type { HrvStatus } from "@/lib/metrics/registry";
import {
  type CheckinRow,
  formatHoursMinutes,
  type SymptomEntryRow,
} from "@/lib/today/checkin";

/**
 * The starting state of the check-in form: today's saved values, or else the
 * latest earlier morning so only what changed needs a tap (02.8). A note and
 * red flags are never carried over from another day.
 */

export type SymptomDraft = {
  id: string;
  key: string;
  name: string;
  scale: "0_10" | "bool";
  pinned: boolean;
  severity: number | null;
  atRest: boolean;
  heartRate: number | null;
};

export type CheckinDraft = {
  sleep: string;
  sleepScore: number | null;
  rhr: number | null;
  hrvMs: number | null;
  hrvStatus: HrvStatus | null;
  energy: number | null;
  desire: number | null;
  legs: number | null;
  note: string;
  redFlags: string[];
  symptoms: SymptomDraft[];
  /** Values came from an earlier day and are not today's yet. */
  fromPrevious: boolean;
};

export type DraftSource = {
  checkin: CheckinRow | null;
  previous: CheckinRow | null;
  symptoms: {
    id: string;
    key: string;
    name: string;
    scale: "0_10" | "bool";
    pinned: boolean;
  }[];
  entries: SymptomEntryRow[];
  previousEntries: SymptomEntryRow[];
};

/** A row counts as a morning check-in once any morning field is set. */
export function isMorning(row: CheckinRow | null): row is CheckinRow {
  return (
    row !== null &&
    [
      row.sleep_minutes,
      row.rhr,
      row.hrv_status,
      row.energy,
      row.desire,
      row.legs,
    ].some((value) => value !== null)
  );
}

export function buildDraft(source: DraftSource): CheckinDraft {
  const today = isMorning(source.checkin) ? source.checkin : null;
  const base = today ?? source.previous;
  const entries = today ? source.entries : source.previousEntries;
  const byId = new Map(entries.map((entry) => [entry.symptom_id, entry]));

  const symptoms = source.symptoms
    .filter((symptom) => symptom.pinned || byId.has(symptom.id))
    .map((symptom): SymptomDraft => {
      const entry = byId.get(symptom.id);
      return {
        ...symptom,
        // A yes/no symptom left alone means «нет» (rules-v1).
        severity: entry?.severity ?? (symptom.scale === "bool" ? 0 : null),
        atRest: entry?.context === "rest",
        heartRate: entry?.heart_rate ?? null,
      };
    });

  return {
    sleep:
      base?.sleep_minutes != null ? formatHoursMinutes(base.sleep_minutes) : "",
    sleepScore: base?.sleep_score ?? null,
    rhr: base?.rhr ?? null,
    hrvMs: base?.hrv_ms ?? null,
    hrvStatus: base?.hrv_status ?? null,
    energy: base?.energy ?? null,
    desire: base?.desire ?? null,
    legs: base?.legs ?? null,
    note: today?.note ?? "",
    redFlags: today?.red_flags ?? source.checkin?.red_flags ?? [],
    symptoms,
    fromPrevious: !today && base !== null,
  };
}
