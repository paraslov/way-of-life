"use client";

import { useTranslations } from "next-intl";
import {
  SignalIcon,
  STATE_SURFACE,
  STATE_TEXT,
} from "@/components/today/signal-badge";
import type { DecisionSnapshot } from "@/lib/decision/decision";
import type { Signal } from "@/lib/light/light";
import { formatHoursMinutes } from "@/lib/today/checkin";
import { cn } from "@/lib/utils";

export function MorningVerdict({
  snapshot,
  draft,
}: {
  snapshot: DecisionSnapshot;
  draft: boolean;
}) {
  const t = useTranslations();
  const { light } = snapshot;
  const attention = light.signals.filter((signal) => signal.state !== "green");
  const normal = light.signals.filter((signal) => signal.state === "green");

  function reason(signal: Signal) {
    const { params, state } = signal;
    if (state === "unknown") return t("light.reasons.unknown");
    switch (signal.key) {
      case "sleep":
        return t(`light.reasons.sleep.${state}`, {
          hours: formatHoursMinutes(Number(params.minutes)),
        });
      case "rhr":
        return (
          t(`light.reasons.rhr.${state}`, {
            value: Number(params.value),
            baseline: Number(params.baseline),
            delta: Number(params.delta),
            highDays: Number(params.highDays),
          }) + (params.basis === "start" ? t("light.reasons.rhrStart") : "")
        );
      case "hrv":
        return (
          t(`hrvStatus.${params.status as "low"}`) +
          (Number(params.lowDays) >= 2
            ? t("light.reasons.hrvLowDays", { lowDays: Number(params.lowDays) })
            : "")
        );
      case "desire":
        return t(`light.reasons.desire.${state}`);
      case "legs":
        return t(`light.reasons.legs.${state}`, {
          heavyDays: Number(params.heavyDays),
        });
      case "knee":
      case "thigh":
        return (
          t(`light.reasons.joint.${state}`, {
            severity: Number(params.severity),
          }) + (params.atRest ? t("light.reasons.jointAtRest") : "")
        );
      case "palpitations":
        return t(`light.reasons.palpitations.${state as "green" | "yellow"}`);
      case "illness":
        return t(`light.reasons.illness.${state as "green" | "red"}`);
    }
  }

  return (
    <section
      aria-labelledby="verdict-title"
      className={cn("rounded-card border p-5", STATE_SURFACE[light.verdict])}
    >
      <div className="flex items-start gap-3">
        <SignalIcon state={light.verdict} className="mt-1 size-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2
            id="verdict-title"
            className={cn(
              "font-serif text-[28px] leading-tight",
              STATE_TEXT[light.verdict],
            )}
          >
            {t(`light.verdict.${light.verdict}`)}
          </h2>
          <p className="mt-1 text-sm">
            {t(`light.verdictHint.${light.verdict}`)}
          </p>
        </div>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {draft ? t("today.draft") : t("today.persisted")}
        </span>
      </div>
      {attention.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {attention.map((signal) => (
            <li key={signal.key} className="flex items-start gap-2 text-[13px]">
              <SignalIcon
                state={signal.state}
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                <strong>{t(`light.signals.${signal.key}`)}</strong>{" "}
                <span className={STATE_TEXT[signal.state]}>
                  {t(`light.state.${signal.state}`)}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {reason(signal)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {normal.length > 0 ? (
        <details className="mt-4 text-[13px]">
          <summary className="cursor-pointer text-signal-green">
            <SignalIcon state="green" className="mr-1 inline size-4" />
            <strong>{t("today.inRange")}</strong> ·{" "}
            {normal
              .map((signal) => t(`light.signals.${signal.key}`))
              .join(", ")}
          </summary>
          <ul className="mt-2 space-y-1 pl-5 text-muted-foreground">
            {normal.map((signal) => (
              <li key={signal.key}>
                {t(`light.signals.${signal.key}`)} · {reason(signal)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {light.ignoredYellow ? (
        <p className="mt-4 text-[13px] text-muted-foreground">
          {t("light.ignoredYellow", {
            signal: t(`light.signals.${light.ignoredYellow}`),
          })}
        </p>
      ) : null}
      {light.noIntensity ? (
        <p className="mt-2 text-[13px] text-signal-yellow">
          {t("light.noIntensity")}
        </p>
      ) : null}
      {light.energy.value !== null ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          {t("light.energy", { value: light.energy.value })} ·{" "}
          {t("light.energyNote")}
        </p>
      ) : null}
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        {t("light.rulesVersion", { version: snapshot.rulesVersion })} · baseline{" "}
        {light.rhrBaseline.value}
      </p>
    </section>
  );
}
