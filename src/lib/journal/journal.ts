import type { ChosenAction } from "@/lib/decision/decision";

/** Whether the user's actual answer departed from the recommendation. */
export function changedFromRecommendation(
  chosen: ChosenAction | null,
  planned: string | null,
  recommended: string | null,
): boolean {
  if (!chosen || !recommended) return false;
  if (chosen === "accept") return false;
  if (chosen === "keep_original") return planned !== recommended;
  return true;
}
