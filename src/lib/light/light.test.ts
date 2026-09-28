import { describe, expect, it } from "vitest";
import { shiftId } from "@/lib/date";
import {
  type DayObservations,
  evaluateLight,
  type LightInput,
  type SignalKey,
} from "./light";

const TODAY = "2026-10-20";

function day(
  offset: number,
  fields: Partial<DayObservations> = {},
): DayObservations {
  return {
    date: shiftId(TODAY, offset),
    sleepMinutes: null,
    rhr: null,
    hrvStatus: null,
    desire: null,
    legs: null,
    energy: null,
    symptoms: {},
    ...fields,
  };
}

/** Every signal known and green. */
const GOOD: Partial<DayObservations> = {
  sleepMinutes: 450,
  rhr: 48,
  hrvStatus: "balanced",
  desire: 3,
  legs: 3,
  energy: 4,
  symptoms: {
    knee: { severity: 0, atRest: false },
    thigh: { severity: 1, atRest: false },
    palpitations: { severity: 0, atRest: false },
    illness: { severity: 0, atRest: false },
  },
};

function light(
  today: Partial<DayObservations>,
  history: DayObservations[] = [],
  rhrStartBaseline = 48,
) {
  const input: LightInput = { today: day(0, today), history, rhrStartBaseline };
  return evaluateLight(input);
}

function state(result: ReturnType<typeof light>, key: SignalKey) {
  return result.signals.find((s) => s.key === key)?.state;
}

describe("sleep", () => {
  it.each([
    [420, "green"],
    [419, "yellow"],
    [360, "yellow"],
    [359, "red"],
    [null, "unknown"],
  ] as const)("%s min → %s", (minutes, expected) => {
    expect(state(light({ sleepMinutes: minutes }), "sleep")).toBe(expected);
  });
});

describe("RHR", () => {
  it("uses the starting thresholds without a baseline: ≤ 51 / 52–54 / ≥ 55", () => {
    const result = light({ rhr: 51 });
    expect(state(result, "rhr")).toBe("green");
    expect(result.rhrBaseline).toEqual({ value: 48, basis: "start", n: 0 });
    expect(state(light({ rhr: 52 }), "rhr")).toBe("yellow");
    expect(state(light({ rhr: 54 }), "rhr")).toBe("yellow");
  });

  it("is yellow for one day at B + 7 and red for two days in a row", () => {
    expect(state(light({ rhr: 55 }), "rhr")).toBe("yellow");
    expect(state(light({ rhr: 55 }, [day(-1, { rhr: 56 })]), "rhr")).toBe(
      "red",
    );
    // Not consecutive: the day before yesterday does not count.
    expect(state(light({ rhr: 55 }, [day(-2, { rhr: 56 })]), "rhr")).toBe(
      "yellow",
    );
  });

  it("switches to the personal median after 14 mornings", () => {
    const history = Array.from({ length: 14 }, (_, i) =>
      day(-(i + 1), { rhr: 44 }),
    );
    const result = light({ rhr: 48 }, history);
    expect(result.rhrBaseline).toEqual({ value: 44, basis: "personal", n: 14 });
    expect(state(result, "rhr")).toBe("yellow");
  });

  it("is unknown without today's value", () => {
    expect(state(light({}), "rhr")).toBe("unknown");
  });
});

describe("HRV status", () => {
  it.each([
    ["balanced", "green"],
    ["unbalanced", "yellow"],
    ["low", "yellow"],
    ["poor", "red"],
  ] as const)("%s → %s", (status, expected) => {
    expect(state(light({ hrvStatus: status }), "hrv")).toBe(expected);
  });

  it("is red after three low days in a row", () => {
    const history = [
      day(-1, { hrvStatus: "low" }),
      day(-2, { hrvStatus: "low" }),
    ];
    expect(state(light({ hrvStatus: "low" }, history), "hrv")).toBe("red");
    expect(state(light({ hrvStatus: "low" }, history.slice(0, 1)), "hrv")).toBe(
      "yellow",
    );
  });
});

describe("desire and legs", () => {
  it("maps desire levels", () => {
    expect(state(light({ desire: 3 }), "desire")).toBe("green");
    expect(state(light({ desire: 2 }), "desire")).toBe("yellow");
    expect(state(light({ desire: 1 }), "desire")).toBe("red");
  });

  it("makes heavy legs red only on the third day in a row", () => {
    expect(state(light({ legs: 3 }), "legs")).toBe("green");
    expect(state(light({ legs: 2 }), "legs")).toBe("yellow");
    const twoDays = [day(-1, { legs: 1 }), day(-2, { legs: 2 })];
    expect(state(light({ legs: 2 }, twoDays), "legs")).toBe("red");
    expect(state(light({ legs: 2 }, twoDays.slice(0, 1)), "legs")).toBe(
      "yellow",
    );
  });
});

describe("symptoms", () => {
  it.each([
    [1, false, "green"],
    [2, false, "yellow"],
    [3, false, "yellow"],
    [4, false, "red"],
    [2, true, "red"],
  ] as const)("knee %s (at rest: %s) → %s", (severity, atRest, expected) => {
    expect(
      state(light({ symptoms: { knee: { severity, atRest } } }), "knee"),
    ).toBe(expected);
  });

  it("gives palpitations a yellow and forbids intensity", () => {
    const result = light({
      ...GOOD,
      symptoms: {
        ...GOOD.symptoms,
        palpitations: { severity: 1, atRest: true },
      },
    });
    expect(state(result, "palpitations")).toBe("yellow");
    expect(result.noIntensity).toBe(true);
    // The lone yellow is ignored, yet the restriction stays.
    expect(result.verdict).toBe("green");
  });

  it("makes illness red", () => {
    const result = light({
      ...GOOD,
      symptoms: { ...GOOD.symptoms, illness: { severity: 1, atRest: false } },
    });
    expect(result.verdict).toBe("red");
  });
});

describe("verdict", () => {
  it("is green when everything is green", () => {
    const result = light(GOOD);
    expect(result.verdict).toBe("green");
    expect(result.ignoredYellow).toBeNull();
    expect(result.noIntensity).toBe(false);
    expect(result.rulesVersion).toBe("1.0");
  });

  it("ignores one yellow among greens but shows it", () => {
    const result = light({ ...GOOD, sleepMinutes: 400 });
    expect(result.verdict).toBe("green");
    expect(result.ignoredYellow).toBe("sleep");
    expect(state(result, "sleep")).toBe("yellow");
  });

  it("counts two yellows", () => {
    const result = light({ ...GOOD, sleepMinutes: 400, desire: 2 });
    expect(result.verdict).toBe("yellow");
    expect(result.ignoredYellow).toBeNull();
  });

  it("does not ignore a yellow that has no known green beside it", () => {
    expect(light({ sleepMinutes: 400 }).verdict).toBe("yellow");
  });

  it("takes the worst known signal and skips unknowns", () => {
    expect(light({ sleepMinutes: 300, desire: 3 }).verdict).toBe("red");
    expect(light({ desire: 3 }).verdict).toBe("green");
  });

  it("is unknown when nothing is known", () => {
    const result = light({});
    expect(result.verdict).toBe("unknown");
    expect(result.signals.every((s) => s.state === "unknown")).toBe(true);
  });

  it("shows energy without counting it", () => {
    const result = light({ ...GOOD, energy: 1 });
    expect(result.verdict).toBe("green");
    expect(result.energy.value).toBe(1);
    expect(result.signals.map((s) => s.key)).not.toContain("energy");
  });

  it("ignores history dated today or later", () => {
    const result = light({ rhr: 55 }, [
      day(0, { rhr: 60 }),
      day(1, { rhr: 60 }),
    ]);
    expect(state(result, "rhr")).toBe("yellow");
  });
});
