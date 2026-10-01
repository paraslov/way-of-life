"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import {
  ActivityLog,
  type LoggedActivity,
} from "@/components/today/activity-log";
import { CheckinForm } from "@/components/today/checkin-form";
import { EveningForm } from "@/components/today/evening-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDayTitle } from "@/lib/date";
import type { EveningRow } from "@/lib/day/evening";
import type { CheckinDraft, SymptomDraft } from "@/lib/today/draft";

/**
 * Fill in a finished day from the journal (D27). The same forms as «Сегодня»,
 * sent with the day's date; the server keeps its decision as it was.
 */
export function PastDayDialog({
  date,
  draft,
  symptoms,
  rhrStart,
  recorded,
  activities,
  steps,
  evening,
  chosen,
  hadDecision,
  closeHref,
}: {
  date: string;
  draft: CheckinDraft;
  symptoms: Omit<SymptomDraft, "severity" | "atRest" | "heartRate">[];
  rhrStart: number;
  recorded: boolean;
  activities: LoggedActivity[];
  steps: number | null;
  evening: EveningRow | null;
  chosen: string | null;
  hadDecision: boolean;
  closeHref: string;
}) {
  const t = useTranslations("journal");
  const router = useRouter();
  const [interacted, setInteracted] = useState(false);
  const onDraftChange = useCallback(() => setInteracted(true), []);
  const onSaved = useCallback(() => router.refresh(), [router]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="first-letter:uppercase">
            {t("editTitle", { date: formatDayTitle(date) })}
          </DialogTitle>
          <DialogDescription>
            {hadDecision ? t("editHintDecision") : t("editHint")}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={recorded ? "evening" : "morning"}>
          <TabsList>
            <TabsTrigger value="morning">{t("editMorning")}</TabsTrigger>
            <TabsTrigger value="evening">{t("editEvening")}</TabsTrigger>
          </TabsList>
          <TabsContent value="morning">
            <CheckinForm
              date={date}
              draft={draft}
              allSymptoms={symptoms}
              startCollapsed={false}
              recorded={recorded}
              saveDisabled={!recorded && !interacted}
              rhrStart={rhrStart}
              onDraftChange={onDraftChange}
              onSaved={onSaved}
            />
          </TabsContent>
          <TabsContent value="evening" className="space-y-4">
            <ActivityLog
              date={date}
              activities={activities}
              steps={steps}
              showSteps={false}
            />
            <EveningForm
              date={date}
              evening={evening}
              steps={steps}
              chosen={chosen}
              showDecisionFit={hadDecision}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
