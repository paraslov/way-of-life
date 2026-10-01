"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ActivityLog } from "@/components/today/activity-log";
import { CheckinForm } from "@/components/today/checkin-form";
import { DecisionCard } from "@/components/today/decision-card";
import { EveningForm } from "@/components/today/evening-form";
import { MorningVerdict } from "@/components/today/morning-verdict";
import { formatDayTitle, formatShortDate, shiftId } from "@/lib/date";
import type { TodayView } from "@/lib/db/today";
import { weekdayIndex } from "@/lib/decision/decision";
import type { CheckinDraft } from "@/lib/today/draft";
import { previewDay } from "@/lib/today/preview";
import { cn } from "@/lib/utils";
import type { WeekSummary } from "@/lib/week/week";

export function TodayExperience({
  view,
  draft,
  week,
  initialPhase,
}: {
  view: TodayView;
  draft: CheckinDraft;
  week: WeekSummary;
  initialPhase: "morning" | "evening";
}) {
  const t = useTranslations();
  const router = useRouter();
  const [phase, setPhase] = useState(initialPhase);
  const [currentDraft, setCurrentDraft] = useState(draft);
  const [dirty, setDirty] = useState(view.decision === null);
  const [interacted, setInteracted] = useState(false);
  const onDraftChange = useCallback((next: CheckinDraft) => {
    setCurrentDraft(next);
    setDirty(true);
    setInteracted(true);
  }, []);
  const onSaved = useCallback(() => setDirty(false), []);
  const pristineFirstDay =
    view.decision === null && view.previous === null && !interacted;
  const preview = useMemo(
    () =>
      previewDay({
        date: view.date,
        // An untouched first-day form has not confirmed the default "No"
        // answers. The empty view should show UNKNOWN until the user begins.
        draft: pristineFirstDay
          ? {
              ...currentDraft,
              symptoms: currentDraft.symptoms.map((symptom) =>
                symptom.scale === "bool"
                  ? { ...symptom, severity: null }
                  : symptom,
              ),
            }
          : currentDraft,
        history: view.history,
        rhrStartBaseline: view.settings.rhrStartBaseline,
        weekTemplate: view.settings.weekTemplate,
        lastIntensityDate: view.lastIntensityDate,
        lthr: view.settings.lthr,
      }),
    [view, currentDraft, pristineFirstDay],
  );
  const decision = !dirty && view.decision ? view.decision : preview;
  const snapshot = decision.snapshot;
  const isDraft = dirty || view.decision === null;
  const nextDate = shiftId(view.date, 1);
  const tomorrow = view.settings.weekTemplate[weekdayIndex(nextDate)];
  const aerobic = week.lines.find(
    (line) => line.metricKey === "aerobic.minutes",
  );
  const strength = week.lines.find(
    (line) => line.metricKey === "strength.sessions",
  );
  const sleep = week.lines.find((line) => line.metricKey === "sleep.duration");

  function changePhase(next: "morning" | "evening") {
    setPhase(next);
    router.replace(next === "morning" ? "/?phase=morning" : "/?phase=evening", {
      scroll: false,
    });
  }

  return (
    <div className="max-w-[1220px]">
      <PageHeader
        eyebrow={t("today.dateLine", {
          date: formatDayTitle(view.date),
          timeZone: view.settings.timezone,
        })}
        title={t("nav.today")}
        description={t("pages.today")}
        action={
          <fieldset className="flex rounded-input bg-accent p-[3px]">
            <legend className="sr-only">{t("today.phaseLabel")}</legend>
            {(["morning", "evening"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={phase === item}
                onClick={() => changePhase(item)}
                className={cn(
                  "min-w-[96px] rounded-button px-3 py-1.5 text-center text-sm",
                  phase === item
                    ? "bg-card font-medium text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <span className="block">{t(`today.phases.${item}`)}</span>
                <span className="block font-mono text-[10px] text-muted-foreground">
                  {t(`today.phaseTime.${item}`)}
                </span>
              </button>
            ))}
          </fieldset>
        }
      />
      <div className="mt-6 flex flex-wrap items-start gap-5">
        <main className="order-2 min-w-0 flex-[1.4_1_440px] space-y-4 min-[900px]:order-1">
          <CheckinForm
            draft={draft}
            allSymptoms={view.symptoms}
            startCollapsed={phase === "evening" || view.decision !== null}
            recorded={view.decision !== null}
            saveDisabled={pristineFirstDay}
            rhrStart={view.settings.rhrStartBaseline}
            onDraftChange={onDraftChange}
            onSaved={onSaved}
          />
          {phase === "evening" ? (
            <>
              <ActivityLog
                activities={view.activities}
                steps={view.checkin?.steps ?? null}
                showSteps={false}
              />
              <EveningForm
                evening={view.evening}
                steps={view.checkin?.steps ?? null}
                chosen={
                  view.decision?.chosenAction
                    ? t(`decision.choices.${view.decision.chosenAction}`)
                    : null
                }
              />
            </>
          ) : null}
        </main>
        <aside className="order-1 min-w-0 flex-[1_1_330px] space-y-4 min-[900px]:order-2 min-[900px]:sticky min-[900px]:top-5">
          {snapshot.redFlags.length > 0 ? (
            <section
              role="alert"
              className="rounded-card border-2 border-signal-red bg-signal-red-tint p-5"
            >
              <p className="font-mono text-[10px] tracking-wider text-signal-red uppercase">
                {t("today.redFlagOutside")}
              </p>
              <div className="mt-2 flex items-start gap-2">
                <TriangleAlert className="size-6 shrink-0 text-signal-red" />
                <h2 className="font-serif text-xl text-signal-red">
                  {t("redFlags.alertBody")}
                </h2>
              </div>
              <ul className="mt-2 list-disc pl-6 text-[13px]">
                {snapshot.redFlags.map((flag) => (
                  <li key={flag}>{t(`redFlags.${flag}`)}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className={snapshot.redFlags.length > 0 ? "opacity-60" : ""}>
            <MorningVerdict snapshot={snapshot} draft={isDraft} />
          </div>
          <DecisionCard
            planned={t(`sessions.${decision.plannedSession}`)}
            recommended={t(`actions.${decision.recommendedAction}`, {
              hrCap: snapshot.hrCap,
            })}
            reason={t(`decision.reasons.${snapshot.reason}`)}
            note={
              snapshot.plan.intensityTooSoon && snapshot.plan.lastIntensityDate
                ? t("decision.intensityTooSoon", {
                    date: formatShortDate(snapshot.plan.lastIntensityDate),
                  })
                : null
            }
            chosen={isDraft ? null : (view.decision?.chosenAction ?? null)}
            customText={isDraft ? null : (view.decision?.customText ?? null)}
            preview={isDraft}
          />
          {phase === "evening" ? (
            <section className="rounded-card border bg-card p-5">
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {t("today.tomorrow")} · {formatShortDate(nextDate)}
              </p>
              <h2 className="mt-2 text-[15px] font-medium">
                {t(`sessions.${tomorrow}`)}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("today.tomorrowHint")}
              </p>
              <dl className="mt-4 space-y-2 border-t pt-3 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt>{t("metrics.aerobic.minutes")}</dt>
                  <dd className="font-mono">
                    {aerobic?.fact ?? 0} / {aerobic?.minimum ?? 150} мин
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("metrics.strength.sessions")}</dt>
                  <dd className="font-mono">
                    {strength?.fact ?? 0} / {strength?.minimum ?? 1}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("metrics.sleep.duration")}</dt>
                  <dd className="font-mono">
                    {sleep?.fact !== null && sleep?.fact !== undefined
                      ? `${Math.floor(sleep.fact / 60)}:${String(sleep.fact % 60).padStart(2, "0")}`
                      : "—"}
                  </dd>
                </div>
              </dl>
              <Link
                href="/week"
                className="mt-4 inline-block text-[13px] underline underline-offset-2"
              >
                {t("today.allWeek")} →
              </Link>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
