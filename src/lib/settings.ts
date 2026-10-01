import { z } from "zod";
import { DEFAULT_TIMEZONE, isTimeZone } from "@/lib/date";
import {
  DEFAULT_WEEK_TEMPLATE,
  PLANNED_SESSIONS,
  type WeekTemplate,
} from "@/lib/decision/sessions";

/**
 * Personal physiology and preferences, stored as the jsonb bag on
 * `user_settings` (architecture §8). Defaults come from docs/content/defaults.md;
 * a stored value always wins, and unknown keys are ignored.
 */
const settingsFields = z.object({
  timezone: z.string().refine(isTimeZone, "Unknown time zone"),
  lthr: z.number().int().min(120).max(210),
  hrMax: z.number().int().min(140).max(230),
  weightKg: z.number().min(30).max(250).nullable(),
  proteinMinG: z.number().int().min(40).max(300),
  proteinMaxG: z.number().int().min(40).max(300),
  /** RHR baseline until 14 own mornings exist (rules-v1, D14). */
  rhrStartBaseline: z.number().int().min(30).max(100),
  weekTemplate: z
    .array(z.enum(PLANNED_SESSIONS))
    .length(7)
    .transform((days) => days as unknown as WeekTemplate),
});

export const settingsSchema = settingsFields
  .refine((s) => s.proteinMinG <= s.proteinMaxG, {
    message: "Protein range is inverted",
    path: ["proteinMaxG"],
  })
  .refine((s) => s.lthr < s.hrMax, {
    message: "LTHR must be below HRmax",
    path: ["lthr"],
  });

/** The fields of the physiology form in settings. */
export const physiologySchema = settingsFields
  .pick({
    timezone: true,
    lthr: true,
    hrMax: true,
    weightKg: true,
    rhrStartBaseline: true,
    proteinMinG: true,
    proteinMaxG: true,
  })
  .refine((s) => s.proteinMinG <= s.proteinMaxG, {
    message: "Protein range is inverted",
    path: ["proteinMaxG"],
  })
  .refine((s) => s.lthr < s.hrMax, {
    message: "LTHR must be below HRmax",
    path: ["lthr"],
  });

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  timezone: DEFAULT_TIMEZONE,
  lthr: 165,
  hrMax: 184,
  weightKg: null,
  proteinMinG: 120,
  proteinMaxG: 140,
  rhrStartBaseline: 48,
  weekTemplate: DEFAULT_WEEK_TEMPLATE,
};

/**
 * Overlays each stored value that is individually valid onto the defaults, so a
 * single bad key never discards the rest of the user's settings.
 */
export function resolveSettings(stored: Record<string, unknown>): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS };
  const shape = settingsFields.shape;
  for (const key of Object.keys(shape) as (keyof Settings)[]) {
    const parsed = shape[key].safeParse(stored[key]);
    if (parsed.success) Object.assign(merged, { [key]: parsed.data });
  }
  return settingsSchema.safeParse(merged).success ? merged : DEFAULT_SETTINGS;
}

/** Typed to confirm «Удалить все данные» in settings. */
export const DELETE_CONFIRMATION = "УДАЛИТЬ";

export type HeartRateZone = {
  zone: 1 | 2 | 3 | 4 | 5;
  /** Inclusive bounds in bpm; `null` means open-ended. */
  min: number | null;
  max: number | null;
};

/**
 * Heart-rate zones from LTHR. The ratios reproduce the v5 plan's table at
 * LTHR 162 (Z1 < 138, Z2 138–148, Z3 149–154, Z4 155–162), so changing LTHR
 * rescales the same zones (D13).
 */
export function heartRateZones(lthr: number): HeartRateZone[] {
  const z1 = Math.round(lthr * 0.85);
  const z2 = Math.round((lthr * 148) / 162);
  const z3 = Math.round((lthr * 154) / 162);
  return [
    { zone: 1, min: null, max: z1 - 1 },
    { zone: 2, min: z1, max: z2 },
    { zone: 3, min: z2 + 1, max: z3 },
    { zone: 4, min: z3 + 1, max: lthr },
    { zone: 5, min: lthr + 1, max: null },
  ];
}
