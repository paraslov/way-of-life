import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ActivityLog } from "@/components/today/activity-log";
import { CheckinForm } from "@/components/today/checkin-form";
import { DecisionCard } from "@/components/today/decision-card";
import { Verdict } from "@/components/today/verdict";
import { formatDayTitle, formatShortDate } from "@/lib/date";
import { getTodayView } from "@/lib/db/today";
import { buildDraft } from "@/lib/today/draft";

export default async function TodayPage() {
  const t = await getTranslations();
  const view = await getTodayView();
  const draft = buildDraft(view);
  const { decision } = view;
  const lastIntensity = decision?.snapshot.plan.lastIntensityDate;

  return (
    <div className="max-w-[720px]">
      <PageHeader
        eyebrow={t("today.dateLine", {
          date: formatDayTitle(view.date),
          timeZone: view.settings.timezone,
        })}
        title={t("nav.today")}
        description={t("pages.today")}
      />

      {decision ? (
        <div className="mt-6 space-y-4">
          <Verdict snapshot={decision.snapshot} />
          <DecisionCard
            planned={t(`sessions.${decision.plannedSession}`)}
            recommended={t(`actions.${decision.recommendedAction}`, {
              hrCap: decision.snapshot.hrCap,
            })}
            reason={t(`decision.reasons.${decision.snapshot.reason}`)}
            note={
              decision.snapshot.plan.intensityTooSoon && lastIntensity
                ? t("decision.intensityTooSoon", {
                    date: formatShortDate(lastIntensity),
                  })
                : null
            }
            chosen={decision.chosenAction}
            customText={decision.customText}
          />
        </div>
      ) : null}

      <section aria-labelledby="checkin-title" className="mt-6 space-y-3">
        <h2
          id="checkin-title"
          className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
        >
          {t("today.checkinTitle")}
        </h2>
        <CheckinForm
          key={view.decision ? "saved" : "new"}
          draft={draft}
          allSymptoms={view.symptoms}
          startCollapsed={view.decision !== null}
          rhrStart={view.settings.rhrStartBaseline}
        />
      </section>

      <div className="mt-8">
        <ActivityLog
          activities={view.activities}
          steps={view.checkin?.steps ?? null}
        />
      </div>
    </div>
  );
}
