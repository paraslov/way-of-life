import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PastDayDialog } from "@/components/journal/past-day-dialog";
import { PageHeader } from "@/components/page-header";
import { SignalIcon, STATE_TEXT } from "@/components/today/signal-badge";
import { signalReason } from "@/components/today/verdict";
import { formatDayTitle } from "@/lib/date";
import { getJournal, type JournalRange } from "@/lib/db/journal";
import { getPastDayView } from "@/lib/db/past-day";
import type { LightState } from "@/lib/light/light";
import { formatHoursMinutes } from "@/lib/today/checkin";
import { buildDraft, isMorning } from "@/lib/today/draft";
import { cn } from "@/lib/utils";

const LIGHTS = ["all", "green", "yellow", "red", "unknown"] as const;
type LightFilter = (typeof LIGHTS)[number];

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations();
  const query = await searchParams;
  const rawRange = String(query.range ?? "30");
  const range: JournalRange =
    rawRange === "7" ? 7 : rawRange === "all" ? "all" : 30;
  const rawLight = String(query.light ?? "all");
  const light: LightFilter = LIGHTS.includes(rawLight as LightFilter)
    ? (rawLight as LightFilter)
    : "all";
  const changed = query.changed === "1";
  const days = await getJournal(range);
  const counts = Object.fromEntries(
    LIGHTS.map((state) => [
      state,
      state === "all"
        ? days.length
        : days.filter((day) => day.verdict === state).length,
    ]),
  );
  const filtered = days.filter(
    (day) =>
      (light === "all" || day.verdict === light) && (!changed || day.changed),
  );
  const open =
    query.day === "none" ? "" : String(query.day ?? filtered[0]?.date ?? "");
  const href = (next: {
    range?: JournalRange;
    light?: LightFilter;
    changed?: boolean;
    day?: string | null;
    edit?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("range", String(next.range ?? range));
    const selectedLight = next.light ?? light;
    if (selectedLight !== "all") params.set("light", selectedLight);
    if (next.changed ?? changed) params.set("changed", "1");
    const day = next.day === undefined ? open : next.day;
    if (day) params.set("day", day);
    if (next.edit) params.set("edit", next.edit);
    return `/journal?${params.toString()}`;
  };
  // The fill-in dialog (D27); a date outside the window loads nothing.
  const edit = typeof query.edit === "string" ? query.edit : null;
  const pastView = edit ? await getPastDayView(edit) : null;

  return (
    <div className="max-w-[1000px]">
      <PageHeader title={t("nav.journal")} description={t("pages.journal")} />
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <fieldset className="flex rounded-button bg-accent p-1">
          <legend className="sr-only">{t("journal.rangeLabel")}</legend>
          {([7, 30, "all"] as const).map((option) => (
            <Link
              key={option}
              href={href({ range: option, day: null })}
              aria-current={range === option ? "true" : undefined}
              className={cn(
                "rounded-button px-3 py-1.5 text-sm",
                range === option && "bg-card shadow-sm",
              )}
            >
              {t(`journal.ranges.${option}`)}
            </Link>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">{t("journal.lightLabel")}</legend>
          {LIGHTS.map((state) => (
            <Link
              key={state}
              href={href({ light: state, day: null })}
              aria-current={light === state ? "true" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-button border px-2.5 text-[13px]",
                light === state && "bg-accent font-medium",
              )}
            >
              {state !== "all" ? (
                <SignalIcon state={state as LightState} className="size-3.5" />
              ) : null}
              {t(`journal.lights.${state}`)}{" "}
              <span className="font-mono text-[11px] text-muted-foreground">
                {counts[state]}
              </span>
            </Link>
          ))}
        </fieldset>
        <Link
          href={href({ changed: !changed, day: null })}
          className="flex items-center gap-2 text-[13px]"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-4 items-center justify-center rounded border",
              changed && "bg-foreground text-background",
            )}
          >
            {changed ? "✓" : ""}
          </span>
          {t("journal.changedOnly")}
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed bg-card p-5 font-serif text-lg text-muted-foreground">
          {t("journal.emptyFiltered")}
        </p>
      ) : (
        <ol className="mt-5 divide-y rounded-card border bg-card">
          {filtered.map((day) => {
            const expanded = open === day.date;
            const recommendation = day.recommendedAction
              ? t(`actions.${day.recommendedAction}`, { hrCap: day.hrCap ?? 0 })
              : day.late?.kind === "filled"
                ? t("journal.filledLater")
                : t("journal.noCheckin");
            const planned = day.plannedSession
              ? t(`sessions.${day.plannedSession}`)
              : null;
            const choice =
              day.chosenAction === "custom" && day.customText
                ? day.customText
                : day.chosenAction
                  ? t(`decision.choices.${day.chosenAction}`)
                  : null;
            const signals =
              day.snapshot?.light.signals ??
              (day.late?.kind === "filled" ? day.late.light.signals : []);
            const reasons = signals.filter(
              (signal) => signal.state !== "green",
            );
            return (
              <li key={day.date} className={expanded ? "bg-field" : ""}>
                <Link
                  href={href({ day: expanded ? "none" : day.date })}
                  aria-expanded={expanded}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-accent"
                >
                  <SignalIcon
                    state={day.verdict}
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-[15px] font-medium first-letter:uppercase">
                        {formatDayTitle(day.date)}
                      </strong>
                      <span
                        className={cn("text-[13px]", STATE_TEXT[day.verdict])}
                      >
                        {t(`light.verdict.${day.verdict}`)}{" "}
                        <span className="ml-1 text-muted-foreground">
                          {expanded ? "⌃" : "⌄"}
                        </span>
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] text-muted-foreground">
                      {planned
                        ? `${planned} → ${recommendation}`
                        : recommendation}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {day.changed ? (
                        <span className="rounded-button border px-2 py-0.5 text-foreground">
                          {t("journal.changedBadge")}
                        </span>
                      ) : null}
                      {choice
                        ? t("decision.chosen", { choice })
                        : t("journal.notChosen")}
                      {day.checkin?.sleep_minutes != null
                        ? ` · ${t("metrics.sleep.duration")} ${formatHoursMinutes(day.checkin.sleep_minutes)}`
                        : ""}
                      {day.checkin?.rhr != null
                        ? ` · ${t("metrics.rhr.daily")} ${day.checkin.rhr}`
                        : ""}
                    </span>
                  </span>
                </Link>
                {expanded ? (
                  <div className="grid gap-5 px-5 pb-5 pl-[52px] text-[13px] min-[700px]:grid-cols-2">
                    <div>
                      <h3 className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        {t("journal.why")}
                      </h3>
                      {reasons.length ? (
                        <ul className="mt-2 space-y-1">
                          {reasons.map((signal) => (
                            <li key={signal.key}>
                              <SignalIcon
                                state={signal.state}
                                className="mr-1 inline size-3.5"
                              />
                              {t(`light.signals.${signal.key}`)} ·{" "}
                              {signalReason(t, signal)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-muted-foreground">
                          {day.snapshot || day.late?.kind === "filled"
                            ? t("journal.allNormal")
                            : t("journal.noCheckin")}
                        </p>
                      )}
                      {day.late?.kind === "filled" ? (
                        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                          {t("journal.filledLaterNote")}
                        </p>
                      ) : null}
                      {day.late?.kind === "corrected" ? (
                        <p className="mt-3 text-muted-foreground">
                          {t("journal.correctedLater", {
                            verdict: t(
                              `light.verdict.${day.late.light.verdict}`,
                            ),
                          })}
                        </p>
                      ) : null}
                      {day.ruleVersion ? (
                        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                          {t("light.rulesVersion", {
                            version: day.ruleVersion,
                          })}{" "}
                          · {t("journal.snapshotSaved")}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        {t("journal.dayDetails")}
                      </h3>
                      <p>
                        <span className="text-muted-foreground">
                          {t("journal.done")} ·{" "}
                        </span>
                        {day.activities.length
                          ? day.activities
                              .map(
                                (activity) =>
                                  `${t(`activityTypes.${activity.type}`)}${activity.duration_min ? ` ${activity.duration_min} мин` : ""}`,
                              )
                              .join(", ")
                          : "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("journal.fit")} ·{" "}
                        </span>
                        {day.evening?.decision_fit
                          ? t(
                              `evening.decisionFits.${day.evening.decision_fit}`,
                            )
                          : "—"}
                      </p>
                      {day.evening?.mood ? (
                        <p>
                          {t("evening.mood")} ·{" "}
                          {t(`evening.moods.${day.evening.mood}`)}
                        </p>
                      ) : null}
                      {day.checkin?.steps != null ? (
                        <p>
                          {t("evening.steps")} ·{" "}
                          {new Intl.NumberFormat("ru").format(
                            day.checkin.steps,
                          )}
                        </p>
                      ) : null}
                      {day.evening?.walk_after_meal != null ? (
                        <p>
                          {t("evening.walkAfterMeal")} ·{" "}
                          {day.evening.walk_after_meal === 3
                            ? "3+"
                            : day.evening.walk_after_meal}
                        </p>
                      ) : null}
                      {day.evening?.protein_band ? (
                        <p>
                          {t("evening.protein")} ·{" "}
                          {t(
                            `evening.proteinBands.${day.evening.protein_band}`,
                          )}{" "}
                          г
                        </p>
                      ) : null}
                      {day.evening?.fiber_band ? (
                        <p>
                          {t("evening.fiber")} ·{" "}
                          {t(`evening.fiberBands.${day.evening.fiber_band}`)} г
                        </p>
                      ) : null}
                      {day.evening?.bedtime_target ? (
                        <p>
                          {t("evening.bedtime")} ·{" "}
                          {t(
                            `evening.bedtimeTargets.${day.evening.bedtime_target}`,
                          )}
                        </p>
                      ) : null}
                      {day.evening?.note ? (
                        <p className="font-serif text-base">
                          «{day.evening.note}»
                        </p>
                      ) : null}
                      {day.editable ? (
                        <Link
                          href={href({ day: day.date, edit: day.date })}
                          scroll={false}
                          className="mt-2 inline-flex h-9 items-center rounded-button border bg-background px-3 text-[13px] font-medium hover:bg-accent"
                        >
                          {t("journal.editDay")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {pastView ? (
        <PastDayDialog
          date={pastView.date}
          draft={buildDraft({
            ...pastView,
            previous: null,
            previousEntries: [],
          })}
          symptoms={pastView.symptoms}
          rhrStart={pastView.settings.rhrStartBaseline}
          recorded={isMorning(pastView.checkin)}
          activities={pastView.activities}
          steps={pastView.checkin?.steps ?? null}
          evening={pastView.evening}
          chosen={
            pastView.decision?.chosenAction
              ? t(`decision.choices.${pastView.decision.chosenAction}`)
              : null
          }
          hadDecision={pastView.decision !== null}
          closeHref={href({ day: pastView.date })}
        />
      ) : null}
    </div>
  );
}
