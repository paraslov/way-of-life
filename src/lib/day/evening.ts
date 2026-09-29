import { z } from "zod";

export const PROTEIN_BANDS = [
  "under_105",
  "105_120",
  "120_140",
  "over_140",
] as const;
export const FIBER_BANDS = ["under_20", "20_25", "25_35", "over_35"] as const;
export const BEDTIME_TARGETS = ["22_30", "23_00", "23_30", "later"] as const;
export const DECISION_FITS = ["ok", "more", "less"] as const;

export const eveningSchema = z.object({
  steps: z.number().int().min(0).max(100_000).nullable(),
  walkAfterMeal: z.number().int().min(0).max(3).nullable(),
  proteinBand: z.enum(PROTEIN_BANDS).nullable(),
  fiberBand: z.enum(FIBER_BANDS).nullable(),
  bedtimeTarget: z.enum(BEDTIME_TARGETS).nullable(),
  decisionFit: z.enum(DECISION_FITS).nullable(),
  note: z.string().trim().max(2000).nullable(),
});

export type EveningInput = z.infer<typeof eveningSchema>;
export type EveningRow = {
  local_date: string;
  walk_after_meal: number | null;
  protein_band: EveningInput["proteinBand"];
  fiber_band: EveningInput["fiberBand"];
  bedtime_target: EveningInput["bedtimeTarget"];
  decision_fit: EveningInput["decisionFit"];
  note: string | null;
};
