import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import {
  SignalIcon,
  STATE_SURFACE,
  STATE_TEXT,
} from "@/components/today/signal-badge";
import {
  WeeklyReviewForm,
  WeekModeSwitch,
} from "@/components/week/week-controls";
import { formatShortDate } from "@/lib/date";
import { getWeekSummary } from "@/lib/db/week";
import { getMetric } from "@/lib/metrics/registry";
import { formatHoursMinutes } from "@/lib/today/checkin";
import { cn } from "@/lib/utils";
import type { TargetLine } from "@/lib/week/week";

function RangeTrack({ line }: { line: TargetLine }) {
  if (line.fact === null) return null;
  const base = line.period === "day" ? line.minimum * 0.75 : 0;
  const top = Math.max(line.targetMax * 1.25, line.fact, base + 1);
  const position = (value: number) =>
    `${Math.max(0, Math.min(100, ((value - base) / (top - base)) * 100))}%`;
  return (
    <div
      role="img"
      aria-label={`Минимум ${line.minimum}, норма ${line.targetMin}–${line.targetMax}, факт ${line.fact}`}
      className="relative mt-3 h-3.5"
    >
      <div className="absolute top-[5px] h-1 w-full rounded-sm bg-border" />
      <div
        className="absolute top-[5px] h-1 rounded-sm bg-signal-green-border"
        style={{
          left: position(line.targetMin),
          width: `${Math.max(0, parseFloat(position(line.targetMax)) - parseFloat(position(line.targetMin)))}%`,
        }}
      />
      <div
        className="absolute top-px h-3 w-0.5 bg-muted-foreground"
        style={{ left: position(line.minimum) }}
      />
      <div
        className="absolute top-px size-2.5 rounded-full bg-foreground ring-2 ring-card"
        style={{ left: position(line.fact) }}
      />
    </div>
  );
}

export default async function WeekPage() {
  const t = await getTranslations();
  const week = await getWeekSummary();
  const relaxed = week.mode === "travel" || week.mode === "illness";
  const number = new Intl.NumberFormat("ru");
  function format(line: TargetLine, value: number) {
    if (line.metricKey === "sleep.duration") return formatHoursMinutes(value);
    return t(
      `week.units.${getMetric(line.metricKey).unit as "min" | "sessions" | "days" | "steps" | "g"}`,
      { value: number.format(value) },
    );
  }
  const remaining = week.lines.filter(
    (line) =>
      line.period === "week" && line.fact !== null && line.fact < line.minimum,
  );
  return (
    <div className="max-w-[1220px]">
      <PageHeader
        eyebrow={t("week.range", {
          start: formatShortDate(week.start),
          end: formatShortDate(week.end),
        })}
        title={t("nav.week")}
        description={t("pages.week")}
        action={<WeekModeSwitch mode={week.mode} />}
      />
      <section aria-labelledby="week-days" className="mt-6">
        <h2
          id="week-days"
          className="mb-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
        >
          {t("week.planFact")}
        </h2>
        <div className="overflow-x-auto pb-2">
          <ol className="grid min-w-[700px] grid-cols-7 gap-2">
            {week.days.map((day, index) => (
              <li
                key={day.date}
                className={cn(
                  "flex min-h-[176px] flex-col rounded-xl border p-3",
                  day.isFuture
                    ? "bg-card text-muted-foreground"
                    : day.verdict
                      ? STATE_SURFACE[day.verdict]
                      : "bg-card",
                  day.isToday && "border-2 border-foreground",
                )}
              >
                <div className="flex justify-between gap-1">
                  <strong className="text-sm">
                    {t(`week.weekdays.${index as 0}`)}
                  </strong>
                  <span className="font-mono text-[11px]">
                    {day.date.slice(8)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[12px]">
                  {day.isFuture ? (
                    <span className="font-mono text-[10px] uppercase">
                      {t("week.future")}
                    </span>
                  ) : (
                    <>
                      <SignalIcon
                        state={day.verdict ?? "unknown"}
                        className="size-4"
                      />
                      <span
                        className={
                          day.verdict
                            ? STATE_TEXT[day.verdict]
                            : "text-muted-foreground"
                        }
                      >
                        {day.verdict
                          ? t(`light.state.${day.verdict}`)
                          : t("week.noVerdict")}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {t("week.plan")}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px]",
                    day.recommendedAction &&
                      day.plannedSession !== day.recommendedAction &&
                      "line-through opacity-60",
                  )}
                >
                  {day.plannedSession
                    ? t(`sessions.${day.plannedSession}`)
                    : "—"}
                </p>
                {day.recommendedAction &&
                day.plannedSession !== day.recommendedAction ? (
                  <p className="mt-1 text-[12px]">
                    {t(`actions.${day.recommendedAction as "rest"}`, {
                      hrCap: 0,
                    })}
                  </p>
                ) : null}
                <div className="mt-auto border-t pt-2">
                  <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {t("week.fact")}
                  </p>
                  <p className="mt-1 text-[12px]">
                    {day.activities?.length
                      ? day.activities
                          .map((activity) =>
                            t(`activityTypes.${activity.type}`),
                          )
                          .join(", ")
                      : day.isFuture
                        ? "—"
                        : t("week.noActivity")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap items-start gap-5">
        <section
          aria-labelledby="week-targets"
          className="min-w-0 flex-[1.5_1_460px] rounded-card border bg-card"
        >
          <h2 id="week-targets" className="px-5 pt-5 font-serif text-xl">
            {t("week.targetsTitle")}
          </h2>
          <ul className="mt-2 divide-y">
            {week.lines.map((line) => {
              const isBand =
                line.metricKey === "protein.daily" ||
                line.metricKey === "fiber.daily";
              const key =
                line.metricKey === "protein.daily"
                  ? "proteinBands"
                  : "fiberBands";
              const bandValue = line.band
                ? t(`evening.${key}.${line.band as "under_105"}`)
                : null;
              const belowWeekly =
                line.period === "week" && line.status === "below";
              const status =
                relaxed && line.status === "below"
                  ? t("week.notCounted", { mode: t(`week.modes.${week.mode}`) })
                  : belowWeekly
                    ? t("week.toMinimum", {
                        value: format(line, line.minimum - (line.fact ?? 0)),
                      })
                    : isBand && bandValue
                      ? t("week.bandRecorded", { days: line.bandDays ?? 0 })
                      : t(`week.status.${line.status}`);
              return (
                <li key={line.metricKey} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[15px] font-medium">
                        {t(`metrics.${line.metricKey}`)}
                      </h3>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {line.period === "day"
                          ? t("week.perDay")
                          : t("week.perWeek")}{" "}
                        · {t("week.minimum")} {format(line, line.minimum)} ·{" "}
                        {t("week.target")} {format(line, line.targetMin)}–
                        {format(line, line.targetMax)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[15px]">
                        {isBand
                          ? (bandValue ?? "—")
                          : line.fact === null
                            ? "—"
                            : format(line, line.fact)}
                      </p>
                      <p
                        className={cn(
                          "text-[13px]",
                          relaxed ||
                            belowWeekly ||
                            isBand ||
                            line.status === "unknown"
                            ? "text-muted-foreground"
                            : line.status === "above"
                              ? "text-slate"
                              : line.status === "target"
                                ? "text-signal-green"
                                : line.status === "minimum"
                                  ? "text-signal-yellow"
                                  : "text-signal-red",
                        )}
                      >
                        {status}
                      </p>
                    </div>
                  </div>
                  {!isBand ? <RangeTrack line={line} /> : null}
                </li>
              );
            })}
          </ul>
          <p className="px-5 py-4 text-[13px] text-muted-foreground">
            {t("week.rangeHint")}
          </p>
        </section>
        <aside className="min-w-0 flex-[1_1_300px] space-y-4">
          <section className="rounded-card border bg-card p-5">
            <h2 className="font-serif text-xl">{t("week.toMinimumTitle")}</h2>
            {relaxed ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("week.relaxedMinimum", {
                  mode: t(`week.modes.${week.mode}`),
                })}
              </p>
            ) : remaining.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {remaining.map((line) => (
                  <li
                    key={line.metricKey}
                    className="flex justify-between gap-2"
                  >
                    <span>{t(`metrics.${line.metricKey}`)}</span>
                    <span className="font-mono">
                      {format(line, line.minimum - (line.fact ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("week.minimumMet")}
              </p>
            )}
          </section>
          <section className="rounded-card border bg-card p-5">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              {t("week.deloadTitle")}
            </p>
            <h2 className="mt-2 font-serif text-xl">
              {t(`week.deload.${week.deload.level}`)}
            </h2>
            <ul className="mt-3 space-y-1 text-[13px] text-muted-foreground">
              <li>
                {t("week.nonGreen", {
                  count: week.deload.nonGreen,
                  total: week.deload.recorded,
                })}
              </li>
              {week.deload.sleepAverage !== null ? (
                <li>
                  {t("week.sleepAverage", {
                    value: formatHoursMinutes(week.deload.sleepAverage),
                  })}
                </li>
              ) : null}
            </ul>
            <p className="mt-3 text-[12px] text-muted-foreground">
              {t("week.deloadHint")}
            </p>
          </section>
          <WeeklyReviewForm
            review={week.review}
            stats={[
              {
                label: t("metrics.aerobic.minutes"),
                value: `${week.lines.find((line) => line.metricKey === "aerobic.minutes")?.fact ?? 0} мин`,
              },
              {
                label: t("metrics.strength.sessions"),
                value: String(
                  week.lines.find(
                    (line) => line.metricKey === "strength.sessions",
                  )?.fact ?? 0,
                ),
              },
              {
                label: t("metrics.sleep.duration"),
                value:
                  week.deload.sleepAverage === null
                    ? "—"
                    : formatHoursMinutes(week.deload.sleepAverage),
              },
              {
                label: t("metrics.energy.morning"),
                value:
                  week.energyAverage === null ? "—" : `${week.energyAverage}/5`,
              },
            ]}
          />
        </aside>
      </div>
    </div>
  );
}
