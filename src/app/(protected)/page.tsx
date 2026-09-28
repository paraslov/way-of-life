import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { CheckinForm } from "@/components/today/checkin-form";
import { formatDayTitle } from "@/lib/date";
import { getTodayView } from "@/lib/db/today";
import { buildDraft } from "@/lib/today/draft";

export default async function TodayPage() {
  const t = await getTranslations();
  const view = await getTodayView();
  const draft = buildDraft(view);

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
    </div>
  );
}
