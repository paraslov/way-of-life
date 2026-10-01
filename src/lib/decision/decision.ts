import { daysBetween, idToDate } from "@/lib/date";
import type {
  DayObservations,
  LightResult,
  LightState,
} from "@/lib/light/light";
import { heartRateZones } from "@/lib/settings";
import type { PlannedSession, WeekTemplate } from "./sessions";

/**
 * The decision of the day (architecture §2, rules-v1 → «Действие»): the
 * template gives the planned session, the verdict substitutes it, and the
 * result is frozen with a snapshot so later rule changes never rewrite it.
 */

export const RED_FLAGS = [
  "palpitations_exercise",
  "chest_pain",
  "presyncope",
  "dyspnea",
] as const;

export type RedFlag = (typeof RED_FLAGS)[number];

export const RECOMMENDED_ACTIONS = [
  "strength_a",
  "strength_b",
  "strength_lite",
  "easy_run",
  "easy_run_capped",
  "easy_run_short",
  "intensity",
  "active_rest",
  "trek",
  "trek_short",
  "rest",
  "rest_or_walk",
  "stop_see_doctor",
] as const;

export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const CHOSEN_ACTIONS = [
  "accept",
  "keep_original",
  "skip",
  "custom",
] as const;

export type ChosenAction = (typeof CHOSEN_ACTIONS)[number];

export type DecisionReason =
  | "as_planned"
  | "unknown"
  | "yellow"
  | "red"
  | "no_intensity"
  | "red_flag";

/** Intensity needs at least this many days since the last one (rules-v1). */
export const INTENSITY_MIN_GAP_DAYS = 7;

export type DecisionInput = {
  date: string;
  weekTemplate: WeekTemplate;
  light: LightResult;
  observations: DayObservations;
  redFlags: readonly RedFlag[];
  /** The last day with an intensity session before `date`, if any. */
  lastIntensityDate: string | null;
  lthr: number;
};

export type DecisionSnapshot = {
  rulesVersion: string;
  observations: DayObservations;
  redFlags: RedFlag[];
  light: Omit<LightResult, "rulesVersion">;
  plan: {
    weekday: number;
    templateSession: PlannedSession;
    lastIntensityDate: string | null;
    intensityTooSoon: boolean;
  };
  hrCap: number;
  reason: DecisionReason;
};

export type DayDecision = {
  ruleVersion: string;
  plannedSession: PlannedSession;
  recommendedAction: RecommendedAction;
  reason: DecisionReason;
  /** Easy-effort ceiling: the top of Z2 from LTHR (151 at LTHR 165). */
  hrCap: number;
  snapshot: DecisionSnapshot;
};

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: string): number {
  return (idToDate(date).getUTCDay() + 6) % 7;
}

const ON_YELLOW: Record<PlannedSession, RecommendedAction> = {
  intensity: "easy_run_capped",
  strength_a: "strength_lite",
  strength_b: "strength_lite",
  easy_run: "easy_run_short",
  trek: "trek_short",
  active_rest: "active_rest",
  rest: "rest",
};

function substitute(
  planned: PlannedSession,
  verdict: LightState,
): RecommendedAction {
  if (verdict === "red") return planned === "rest" ? "rest" : "rest_or_walk";
  if (verdict === "yellow") return ON_YELLOW[planned];
  return planned;
}

export function decideDay(input: DecisionInput): DayDecision {
  const weekday = weekdayIndex(input.date);
  const templateSession = input.weekTemplate[weekday];
  const intensityTooSoon =
    templateSession === "intensity" &&
    input.lastIntensityDate !== null &&
    daysBetween(input.date, input.lastIntensityDate) < INTENSITY_MIN_GAP_DAYS;
  const plannedSession: PlannedSession = intensityTooSoon
    ? "easy_run"
    : templateSession;

  const { verdict } = input.light;
  let recommendedAction = substitute(plannedSession, verdict);
  let reason: DecisionReason =
    verdict === "unknown"
      ? "unknown"
      : recommendedAction === plannedSession
        ? "as_planned"
        : verdict === "red"
          ? "red"
          : "yellow";

  if (input.light.noIntensity && recommendedAction === "intensity") {
    recommendedAction = "easy_run_capped";
    reason = "no_intensity";
  }
  if (input.redFlags.length > 0) {
    recommendedAction = "stop_see_doctor";
    reason = "red_flag";
  }

  const hrCap = heartRateZones(input.lthr)[1].max ?? input.lthr;
  const { rulesVersion, ...light } = input.light;

  return {
    ruleVersion: rulesVersion,
    plannedSession,
    recommendedAction,
    reason,
    hrCap,
    snapshot: {
      rulesVersion,
      observations: input.observations,
      redFlags: [...input.redFlags],
      light,
      plan: {
        weekday,
        templateSession,
        lastIntensityDate: input.lastIntensityDate,
        intensityTooSoon,
      },
      hrCap,
      reason,
    },
  };
}
