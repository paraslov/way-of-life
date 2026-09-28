import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { SignalIcon, STATE_TEXT } from "@/components/today/signal-badge";
import { formatDayTitle } from "@/lib/date";
import { getJournal } from "@/lib/db/journal";
import { cn } from "@/lib/utils";

export default async function JournalPage() {
  const t = await getTranslations();
  const days = await getJournal();

  return (
    <div className="max-w-[720px]">
      <PageHeader title={t("nav.journal")} description={t("pages.journal")} />

      {days.length === 0 ? (
        <p className="mt-6 max-w-[62ch] rounded-card border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
          {t("journal.empty")}
        </p>
      ) : (
        <ol className="mt-6 divide-y rounded-card border bg-background">
          {days.map((day) => {
            const changed = day.recommendedAction !== day.plannedSession;
            return (
              <li key={day.date} className="flex gap-3 px-4 py-3 text-sm">
                <SignalIcon state={day.verdict} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium first-letter:uppercase">
                      {formatDayTitle(day.date)}
                    </span>
                    <span className={cn("text-xs", STATE_TEXT[day.verdict])}>
                      {t(`light.verdict.${day.verdict}`)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {changed
                      ? t("journal.changed", {
                          planned: t(`sessions.${day.plannedSession}`),
                          recommended: t(`actions.${day.recommendedAction}`, {
                            hrCap: day.hrCap,
                          }),
                        })
                      : t(`actions.${day.recommendedAction}`, {
                          hrCap: day.hrCap,
                        })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.chosenAction
                      ? t("decision.chosen", {
                          choice:
                            day.chosenAction === "custom" && day.customText
                              ? day.customText
                              : t(`decision.choices.${day.chosenAction}`),
                        })
                      : t("journal.notChosen")}
                    {" · "}
                    {t("light.rulesVersion", { version: day.ruleVersion })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
