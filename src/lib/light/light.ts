import { type Baseline, metricBaseline } from "@/lib/baseline/baseline";
import { shiftId } from "@/lib/date";
import type { HrvStatus } from "@/lib/metrics/registry";

/**
 * Traffic light v1 (docs/content/rules-v1.md, architecture §6). Pure: the
 * caller passes today's observations and the past days, and gets per-signal
 * states with the numbers behind them plus the verdict. There is no score.
 * Red flags are not handled here: they sit outside the light.
 */
export const RULES_VERSION = "1.1";

export type LightState = "green" | "yellow" | "red" | "unknown";

export const SIGNAL_KEYS = [
  "sleep",
  "rhr",
  "hrv",
  "desire",
  "legs",
  "knee",
  "thigh",
  "palpitations",
  "illness",
] as const;

export type SignalKey = (typeof SIGNAL_KEYS)[number];

/** A 0–10 symptom, or a yes/no one stored as 0/1. */
export type SymptomReading = { severity: number; atRest: boolean };

/** One day of the observations the rules read. Missing = not entered. */
export type DayObservations = {
  date: string;
  sleepMinutes: number | null;
  rhr: number | null;
  hrvStatus: HrvStatus | null;
  /** 3 = хочется выйти, 2 = нейтрально, 1 = даже вставать не хочется. */
  desire: number | null;
  /** 3 = лёгкие, 2 = тяжёлые, 1 = забитые. */
  legs: number | null;
  energy: number | null;
  symptoms: Partial<
    Record<"knee" | "thigh" | "palpitations" | "illness", SymptomReading>
  >;
};

export type Signal = {
  key: SignalKey;
  state: LightState;
  /** Numbers for the explanation line; never used to rank signals. */
  params: Record<string, number | string | boolean>;
};

export type LightResult = {
  rulesVersion: string;
  verdict: LightState;
  signals: Signal[];
  /** The single yellow that rule 3 left out of the verdict, if any. */
  ignoredYellow: SignalKey | null;
  /** Palpitations in the last day: no intensity today, whatever the verdict. */
  noIntensity: boolean;
  /** Shown but not counted in v1. */
  energy: { value: number | null; baseline: Baseline | null };
  rhrBaseline: { value: number; basis: "personal" | "start"; n: number };
};

export type LightInput = {
  today: DayObservations;
  /** Earlier days, any order; used for baselines and "N days in a row". */
  history: readonly DayObservations[];
  /** RHR baseline until there are 14 own mornings (48, D14). */
  rhrStartBaseline: number;
};

const RANK: Record<Exclude<LightState, "unknown">, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

function signal(
  key: SignalKey,
  state: LightState,
  params: Signal["params"] = {},
): Signal {
  return { key, state, params };
}

/** Consecutive days ending today (inclusive) for which `test` holds. */
function streak(
  input: LightInput,
  test: (day: DayObservations) => boolean,
): number {
  const byDate = new Map(input.history.map((day) => [day.date, day]));
  let count = 0;
  let day: DayObservations | undefined = input.today;
  while (day && test(day)) {
    count += 1;
    day = byDate.get(shiftId(day.date, -1));
  }
  return count;
}

function sleepSignal({ sleepMinutes }: DayObservations): Signal {
  if (sleepMinutes === null) return signal("sleep", "unknown");
  const state =
    sleepMinutes >= 420 ? "green" : sleepMinutes >= 360 ? "yellow" : "red";
  return signal("sleep", state, { minutes: sleepMinutes });
}

function rhrSignal(
  input: LightInput,
  base: LightResult["rhrBaseline"],
): Signal {
  const { rhr } = input.today;
  const params = { baseline: base.value, basis: base.basis };
  if (rhr === null) return signal("rhr", "unknown", params);
  const delta = Math.round((rhr - base.value) * 10) / 10;
  const high = (day: DayObservations) =>
    day.rhr !== null && day.rhr >= base.value + 7;
  const state =
    delta <= 3
      ? "green"
      : !high(input.today)
        ? "yellow"
        : streak(input, high) >= 2
          ? "red"
          : "yellow";
  return signal("rhr", state, {
    ...params,
    value: rhr,
    delta,
    highDays: streak(input, high),
  });
}

function hrvSignal(input: LightInput): Signal {
  const status = input.today.hrvStatus;
  if (status === null) return signal("hrv", "unknown");
  const lowDays = streak(input, (day) => day.hrvStatus === "low");
  const state =
    status === "balanced"
      ? "green"
      : status === "poor" || lowDays >= 3
        ? "red"
        : "yellow";
  return signal("hrv", state, { status, lowDays });
}

function desireSignal({ desire }: DayObservations): Signal {
  if (desire === null) return signal("desire", "unknown");
  const state = desire >= 3 ? "green" : desire === 2 ? "yellow" : "red";
  return signal("desire", state, { level: desire });
}

function legsSignal(input: LightInput): Signal {
  const { legs } = input.today;
  if (legs === null) return signal("legs", "unknown");
  const heavyDays = streak(input, (day) => day.legs !== null && day.legs <= 2);
  const state = legs >= 3 ? "green" : heavyDays >= 3 ? "red" : "yellow";
  return signal("legs", state, { level: legs, heavyDays });
}

/** 0–1 green, 2–3 yellow, ≥ 4 or pain at rest (≥ 2) red. */
function jointSignal(key: "knee" | "thigh", day: DayObservations): Signal {
  const reading = day.symptoms[key];
  if (!reading) return signal(key, "unknown");
  const { severity, atRest } = reading;
  const state =
    severity >= 4 || (atRest && severity >= 2)
      ? "red"
      : severity >= 2
        ? "yellow"
        : "green";
  return signal(key, state, { severity, atRest });
}

function presenceSignal(
  key: "palpitations" | "illness",
  day: DayObservations,
  whenPresent: LightState,
): Signal {
  const reading = day.symptoms[key];
  if (!reading) return signal(key, "unknown");
  const present = reading.severity > 0;
  return signal(key, present ? whenPresent : "green", { present });
}

export function evaluateLight(input: LightInput): LightResult {
  const past = input.history.filter((day) => day.date < input.today.date);
  const personal = metricBaseline(
    "rhr.daily",
    past.map((day) => ({ date: day.date, value: day.rhr })),
    input.today.date,
  );
  const rhrBaseline: LightResult["rhrBaseline"] = personal
    ? { value: personal.value, basis: "personal", n: personal.n }
    : { value: input.rhrStartBaseline, basis: "start", n: 0 };
  const scoped = { ...input, history: past };

  const signals = [
    sleepSignal(input.today),
    rhrSignal(scoped, rhrBaseline),
    hrvSignal(scoped),
    desireSignal(input.today),
    legsSignal(scoped),
    jointSignal("knee", input.today),
    jointSignal("thigh", input.today),
    presenceSignal("palpitations", input.today, "yellow"),
    presenceSignal("illness", input.today, "red"),
  ];

  const known = signals.filter((s) => s.state !== "unknown");
  const yellows = known.filter((s) => s.state === "yellow");
  const others = known.filter((s) => s.state !== "yellow");
  const loneYellow =
    yellows.length === 1 &&
    others.length > 0 &&
    others.every((s) => s.state === "green");

  let verdict: LightState = "unknown";
  if (loneYellow) {
    verdict = "green";
  } else if (known.length > 0) {
    verdict = known.reduce<Exclude<LightState, "unknown">>(
      (worst, s) =>
        RANK[s.state as keyof typeof RANK] > RANK[worst]
          ? (s.state as keyof typeof RANK)
          : worst,
      "green",
    );
  }

  return {
    rulesVersion: RULES_VERSION,
    verdict,
    signals,
    ignoredYellow: loneYellow ? yellows[0].key : null,
    noIntensity: (input.today.symptoms.palpitations?.severity ?? 0) > 0,
    energy: {
      value: input.today.energy,
      baseline: metricBaseline(
        "energy.morning",
        past.map((day) => ({ date: day.date, value: day.energy })),
        input.today.date,
      ),
    },
    rhrBaseline,
  };
}
