import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import {
  SignalIcon,
  STATE_SURFACE,
  STATE_TEXT,
} from "@/components/today/signal-badge";
import { formatShortDate } from "@/lib/date";
import { getWeekSummary } from "@/lib/db/week";
import { getMetric } from "@/lib/metrics/registry";
import { formatHoursMinutes } from "@/lib/today/checkin";
import { cn } from "@/lib/utils";
import type { TargetLine, TargetStatus } from "@/lib/week/week";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const STATUS_TEXT: Record<TargetStatus, string> = {
  unknown: "text-muted-foreground",
  below: "text-signal-red",
  minimum: "text-signal-yellow",
  target: "text-signal-green",
  above: "text-signal-green",
};

const number = new Intl.NumberFormat("ru");

function formatValue(t: Translator, line: TargetLine, value: number) {
  if (line.metricKey === "sleep.duration") return formatHoursMinutes(value);
  const unit = getMetric(line.metricKey).unit as
    | "min"
    | "sessions"
    | "days"
    | "steps"
    | "g";
  return t(`week.units.${unit}`, { value: number.format(value) });
}

function formatTarget(t: Translator, line: TargetLine) {
  const low = formatValue(t, line, line.targetMin);
  return line.targetMin === line.targetMax
    ? low
    : `${low}–${formatValue(t, line, line.targetMax)}`;
}

export default async function WeekPage() {
  const t = await getTranslations();
  const week = await getWeekSummary();

  return (
    <div className="max-w-[720px]">
      <PageHeader
        eyebrow={t("week.range", {
          start: formatShortDate(week.start),
          end: formatShortDate(week.end),
        })}
        title={t("nav.week")}
        description={t("pages.week")}
      />

      <section aria-labelledby="days-title" className="mt-6">
        <h2
          id="days-title"
          className="mb-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
        >
          {t("week.daysTitle")}
        </h2>
        <ol className="grid grid-cols-7 gap-1.5">
          {week.days.map((day, index) => {
            const state = day.verdict ?? "unknown";
            const label = day.verdict
              ? t(`light.verdict.${day.verdict}`)
              : day.isFuture
                ? t("week.future")
                : t("week.noVerdict");
            return (
              <li
                key={day.date}
                aria-label={`${t(`week.weekdays.${index as 0}`)}: ${label}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-input border px-1 py-2 text-xs",
                  day.verdict ? STATE_SURFACE[state] : "bg-background",
                  day.isFuture && "opacity-50",
                  day.isToday && "ring-2 ring-foreground",
                )}
              >
                <span className="font-medium">
                  {t(`week.weekdays.${index as 0}`)}
                </span>
                {day.verdict ? (
                  <SignalIcon state={day.verdict} />
                ) : (
                  <span
                    aria-hidden
                    className="size-4 text-center text-muted-foreground"
                  >
                    ·
                  </span>
                )}
                <span
                  className={cn(
                    "hidden text-[10px] min-[480px]:block",
                    day.verdict ? STATE_TEXT[state] : "text-muted-foreground",
                  )}
                >
                  {day.verdict ? t(`light.state.${day.verdict}`) : "—"}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="targets-title" className="mt-8">
        <h2
          id="targets-title"
          className="mb-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
        >
          {t("week.targetsTitle")}
        </h2>
        <ul className="divide-y rounded-card border bg-background">
          {week.lines.map((line) => (
            <li
              key={line.metricKey}
              className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{t(`metrics.${line.metricKey}`)}</p>
                <p className="text-xs text-muted-foreground">
                  {line.period === "day" ? t("week.perDay") : t("week.perWeek")}
                  {" · "}
                  {t("week.minimum")} {formatValue(t, line, line.minimum)}
                  {" · "}
                  {t("week.target")} {formatTarget(t, line)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono tabular-nums">
                  {line.fact === null ? "—" : formatValue(t, line, line.fact)}
                </p>
                <p className={cn("text-xs", STATUS_TEXT[line.status])}>
                  {t(`week.status.${line.status}`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t("week.note")}</p>
      </section>
    </div>
  );
}
