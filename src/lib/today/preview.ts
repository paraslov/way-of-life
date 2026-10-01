import {
  type DayDecision,
  decideDay,
  RED_FLAGS,
  type RedFlag,
} from "@/lib/decision/decision";
import type { WeekTemplate } from "@/lib/decision/sessions";
import { type DayObservations, evaluateLight } from "@/lib/light/light";
import { parseHoursMinutes } from "@/lib/today/checkin";
import type { CheckinDraft } from "@/lib/today/draft";

export function previewDay(input: {
  date: string;
  draft: CheckinDraft;
  history: readonly DayObservations[];
  rhrStartBaseline: number;
  weekTemplate: WeekTemplate;
  lastIntensityDate: string | null;
  lthr: number;
}): DayDecision {
  const sleep = parseHoursMinutes(input.draft.sleep);
  const symptoms: DayObservations["symptoms"] = {};
  for (const symptom of input.draft.symptoms) {
    if (symptom.severity === null) continue;
    if (
      symptom.key === "knee" ||
      symptom.key === "thigh" ||
      symptom.key === "palpitations" ||
      symptom.key === "illness"
    ) {
      symptoms[symptom.key] = {
        severity: symptom.severity,
        atRest: symptom.atRest,
      };
    }
  }
  const observations: DayObservations = {
    date: input.date,
    sleepMinutes: sleep === undefined ? null : sleep,
    rhr: input.draft.rhr,
    hrvStatus: input.draft.hrvStatus,
    energy: input.draft.energy,
    desire: input.draft.desire,
    legs: input.draft.legs,
    symptoms,
  };
  const light = evaluateLight({
    today: observations,
    history: input.history,
    rhrStartBaseline: input.rhrStartBaseline,
  });
  const redFlags = input.draft.redFlags.filter((flag): flag is RedFlag =>
    (RED_FLAGS as readonly string[]).includes(flag),
  );
  return decideDay({
    date: input.date,
    weekTemplate: input.weekTemplate,
    light,
    observations,
    redFlags,
    lastIntensityDate: input.lastIntensityDate,
    lthr: input.lthr,
  });
}
