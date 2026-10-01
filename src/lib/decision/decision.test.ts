import { describe, expect, it } from "vitest";
import ru from "@/i18n/messages/ru.json";
import type { DayObservations, LightResult } from "@/lib/light/light";
import { evaluateLight } from "@/lib/light/light";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  type DecisionInput,
  decideDay,
  RECOMMENDED_ACTIONS,
  type RedFlag,
  weekdayIndex,
} from "./decision";
import { PLANNED_SESSIONS } from "./sessions";

// 2026-10-19 is a Monday.
const MON = "2026-10-19";
const WED = "2026-10-21";
const SUN = "2026-10-25";

function observations(date: string): DayObservations {
  return {
    date,
    sleepMinutes: null,
    rhr: null,
    hrvStatus: null,
    desire: null,
    legs: null,
    energy: null,
    symptoms: {},
  };
}

function lightWith(
  verdict: LightResult["verdict"],
  noIntensity = false,
): LightResult {
  return {
    ...evaluateLight({
      today: observations(MON),
      history: [],
      rhrStartBaseline: 48,
    }),
    verdict,
    noIntensity,
  };
}

function decide(
  date: string,
  verdict: LightResult["verdict"],
  extra: Partial<DecisionInput> = {},
) {
  return decideDay({
    date,
    weekTemplate: DEFAULT_SETTINGS.weekTemplate,
    light: lightWith(verdict),
    observations: observations(date),
    redFlags: [],
    lastIntensityDate: null,
    lthr: 165,
    ...extra,
  });
}

describe("weekdayIndex", () => {
  it("counts from Monday", () => {
    expect(weekdayIndex(MON)).toBe(0);
    expect(weekdayIndex(WED)).toBe(2);
    expect(weekdayIndex(SUN)).toBe(6);
  });
});

describe("decideDay", () => {
  it("follows the template when green", () => {
    const decision = decide(MON, "green");
    expect(decision).toMatchObject({
      plannedSession: "strength_a",
      recommendedAction: "strength_a",
      reason: "as_planned",
      ruleVersion: "1.1",
      hrCap: 151,
    });
  });

  it.each([
    [MON, "strength_lite"],
    ["2026-10-20", "easy_run_short"],
    [WED, "easy_run_capped"],
    ["2026-10-24", "trek_short"],
    [SUN, "rest"],
  ])("substitutes on yellow: %s → %s", (date, action) => {
    expect(decide(date, "yellow").recommendedAction).toBe(action);
  });

  it("turns any training into rest or a walk on red", () => {
    expect(decide(WED, "red")).toMatchObject({
      recommendedAction: "rest_or_walk",
      reason: "red",
    });
    expect(decide(SUN, "red").recommendedAction).toBe("rest");
  });

  it("keeps the plan when the verdict is unknown", () => {
    expect(decide(WED, "unknown")).toMatchObject({
      recommendedAction: "intensity",
      reason: "unknown",
    });
  });

  it("plans an easy run on Wednesday when the last intensity was under 7 days ago", () => {
    const decision = decide(WED, "green", { lastIntensityDate: "2026-10-15" });
    expect(decision.plannedSession).toBe("easy_run");
    expect(decision.snapshot.plan).toMatchObject({
      templateSession: "intensity",
      intensityTooSoon: true,
    });
    expect(
      decide(WED, "green", { lastIntensityDate: "2026-10-14" }).plannedSession,
    ).toBe("intensity");
  });

  it("drops intensity after palpitations even when green", () => {
    const decision = decide(WED, "green", { light: lightWith("green", true) });
    expect(decision).toMatchObject({
      recommendedAction: "easy_run_capped",
      reason: "no_intensity",
    });
  });

  it("lets a red flag override everything", () => {
    const redFlags: RedFlag[] = ["chest_pain"];
    expect(decide(MON, "green", { redFlags })).toMatchObject({
      recommendedAction: "stop_see_doctor",
      reason: "red_flag",
    });
  });

  it("scales the easy ceiling with LTHR", () => {
    expect(decide(MON, "green", { lthr: 162 }).hrCap).toBe(148);
  });

  it("freezes inputs, signals and rule version in the snapshot", () => {
    const decision = decide(MON, "green", { redFlags: [] });
    expect(decision.snapshot).toMatchObject({
      rulesVersion: "1.1",
      observations: { date: MON },
      light: { verdict: "green" },
      hrCap: 151,
    });
    expect(JSON.parse(JSON.stringify(decision.snapshot))).toEqual(
      decision.snapshot,
    );
  });
});

describe("catalog", () => {
  it("names every planned session and recommended action", () => {
    for (const code of PLANNED_SESSIONS) {
      expect(ru.sessions[code], code).toBeTruthy();
    }
    for (const code of RECOMMENDED_ACTIONS) {
      expect(ru.actions[code], code).toBeTruthy();
    }
  });
});
