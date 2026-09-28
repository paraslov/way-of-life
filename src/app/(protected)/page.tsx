import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { formatDayTitle, todayId } from "@/lib/date";
import { resolveTimeZone } from "@/lib/timezone";

export default async function TodayPage() {
  const t = await getTranslations();
  const timeZone = await resolveTimeZone();

  return (
    <>
      <PageHeader
        eyebrow={t("today.dateLine", {
          date: formatDayTitle(todayId(timeZone)),
          timeZone,
        })}
        title={t("nav.today")}
        description={t("pages.today")}
      />
      <p className="mt-6 max-w-[62ch] rounded-card border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
        {t("pages.comingIn", { stage: "02" })}
      </p>
    </>
  );
}
