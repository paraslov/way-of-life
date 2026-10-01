import { getTranslations } from "next-intl/server";
import {
  SignalIcon,
  STATE_SURFACE,
  STATE_TEXT,
} from "@/components/today/signal-badge";
import type { DecisionSnapshot } from "@/lib/decision/decision";
import type { Signal } from "@/lib/light/light";
import { formatHoursMinutes } from "@/lib/today/checkin";
import { cn } from "@/lib/utils";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/** «5:52: меньше 6 ч» — the numbers behind one signal's state. */
export function signalReason(t: Translator, signal: Signal): string {
  const { key, state, params } = signal;
  if (state === "unknown") return t("light.reasons.unknown");
  switch (key) {
    case "sleep":
      return t(`light.reasons.sleep.${state}`, {
        hours: formatHoursMinutes(Number(params.minutes)),
      });
    case "rhr": {
      const text = t(`light.reasons.rhr.${state}`, {
        value: Number(params.value),
        baseline: Number(params.baseline),
        delta: Number(params.delta),
        highDays: Number(params.highDays),
      });
      return params.basis === "start"
        ? text + t("light.reasons.rhrStart")
        : text;
    }
    case "hrv": {
      const text = t(`hrvStatus.${params.status as "low"}`);
      return Number(params.lowDays) >= 2
        ? text +
            t("light.reasons.hrvLowDays", { lowDays: Number(params.lowDays) })
        : text;
    }
    case "desire":
      return t(`light.reasons.desire.${state}`);
    case "legs":
      return t(`light.reasons.legs.${state}`, {
        heavyDays: Number(params.heavyDays),
      });
    case "knee":
    case "thigh": {
      const text = t(`light.reasons.joint.${state}`, {
        severity: Number(params.severity),
      });
      return params.atRest ? text + t("light.reasons.jointAtRest") : text;
    }
    case "palpitations":
      return t(`light.reasons.palpitations.${state as "green" | "yellow"}`);
    case "illness":
      return t(`light.reasons.illness.${state as "green" | "red"}`);
  }
}

/**
 * The verdict with one line per signal (02.9). Rendered from the stored
 * snapshot, so a day shows what was recommended then, whatever the rules
 * say now.
 */
export async function Verdict({ snapshot }: { snapshot: DecisionSnapshot }) {
  const t = await getTranslations();
  const { light } = snapshot;
  const known = light.signals.filter((s) => s.state !== "unknown");
  const unknown = light.signals.filter((s) => s.state === "unknown");

  return (
    <section
      aria-labelledby="verdict-title"
      className={cn("rounded-card border p-4", STATE_SURFACE[light.verdict])}
    >
      <div className="flex items-center gap-2.5">
        <SignalIcon state={light.verdict} className="size-7" />
        <div>
          <h2
            id="verdict-title"
            className={cn(
              "font-serif text-2xl leading-tight",
              STATE_TEXT[light.verdict],
            )}
          >
            {t(`light.verdict.${light.verdict}`)}
          </h2>
          <p className="text-sm">{t(`light.verdictHint.${light.verdict}`)}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {known.map((signal) => (
          <li key={signal.key} className="flex items-start gap-2 text-sm">
            <SignalIcon state={signal.state} className="mt-0.5" />
            <span>
              <span className="font-medium">
                {t(`light.signals.${signal.key}`)}
              </span>{" "}
              <span className={cn("text-xs", STATE_TEXT[signal.state])}>
                {t(`light.state.${signal.state}`)}
              </span>
              <span className="text-muted-foreground">
                {" · "}
                {signalReason(t, signal)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {unknown.length > 0 ? (
        <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <SignalIcon state="unknown" className="mt-px size-3.5" />
          <span>
            {t("light.reasons.unknown")}:{" "}
            {unknown.map((s) => t(`light.signals.${s.key}`)).join(", ")}
          </span>
        </p>
      ) : null}

      <div className="mt-3 space-y-1 text-sm">
        {light.ignoredYellow ? (
          <p>
            {t("light.ignoredYellow", {
              signal: t(`light.signals.${light.ignoredYellow}`),
            })}
          </p>
        ) : null}
        {light.noIntensity ? <p>{t("light.noIntensity")}</p> : null}
        {light.energy.value !== null ? (
          <p className="text-muted-foreground">
            {t("light.energy", { value: light.energy.value })}
            {light.energy.baseline
              ? ` · ${t("light.energyBaseline", { baseline: light.energy.baseline.value })}`
              : ""}
            {` · ${t("light.energyNote")}`}
          </p>
        ) : null}
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        {t("light.rulesVersion", { version: snapshot.rulesVersion })}
      </p>
    </section>
  );
}
