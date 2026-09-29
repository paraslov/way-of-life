import { z } from "zod";
import type { WeekSummary } from "@/lib/week/week";

export const WEEK_MODES = ["normal", "deload", "travel", "illness"] as const;
export type WeekMode = (typeof WEEK_MODES)[number];
export const weekModeSchema = z.enum(WEEK_MODES);

export const weeklyReviewSchema = z
  .object({
    helped: z.string().trim().max(2000).nullable(),
    hurt: z.string().trim().max(2000).nullable(),
    changeNext: z.boolean().nullable(),
    changeText: z.string().trim().max(500).nullable(),
  })
  .refine(
    (review) => review.changeNext === true || review.changeText === null,
    {
      path: ["changeText"],
    },
  );
export type WeeklyReviewInput = z.infer<typeof weeklyReviewSchema>;
export type WeeklyReviewRow = {
  helped: string | null;
  hurt: string | null;
  change_next: boolean | null;
  change_text: string | null;
};

export type DeloadAdvice = {
  level: "observe" | "reduce" | "recover";
  nonGreen: number;
  recorded: number;
  sleepAverage: number | null;
  reasons: string[];
};

/** Conservative suggestion; the user chooses whether to switch the week mode. */
export function adviseDeload(summary: WeekSummary): DeloadAdvice {
  const elapsed = summary.days.filter((day) => !day.isFuture);
  const known = elapsed.filter(
    (day) => day.verdict !== null && day.verdict !== "unknown",
  );
  const nonGreen = known.filter(
    (day) => day.verdict === "yellow" || day.verdict === "red",
  ).length;
  const red = known.filter((day) => day.verdict === "red").length;
  const sleepAverage =
    summary.lines.find((line) => line.metricKey === "sleep.duration")?.fact ??
    null;
  const reasons: string[] = [];
  if (known.length) reasons.push(`nonGreen:${nonGreen}:${known.length}`);
  if (sleepAverage !== null && sleepAverage < 420)
    reasons.push(`sleep:${sleepAverage}`);
  if (red >= 2)
    return {
      level: "recover",
      nonGreen,
      recorded: known.length,
      sleepAverage,
      reasons,
    };
  if (
    (nonGreen >= 3 && known.length >= 3) ||
    (sleepAverage !== null &&
      sleepAverage < 420 &&
      known.length >= 3 &&
      nonGreen >= 2)
  ) {
    return {
      level: "reduce",
      nonGreen,
      recorded: known.length,
      sleepAverage,
      reasons,
    };
  }
  return {
    level: "observe",
    nonGreen,
    recorded: known.length,
    sleepAverage,
    reasons,
  };
}
