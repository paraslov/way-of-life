import { TodayExperience } from "@/components/today/today-experience";
import { getTodayView } from "@/lib/db/today";
import { getWeekSummary } from "@/lib/db/week";
import { buildDraft } from "@/lib/today/draft";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const view = await getTodayView();
  const week = await getWeekSummary();
  const query = await searchParams;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: view.settings.timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const initialPhase =
    query.phase === "morning" || query.phase === "evening"
      ? query.phase
      : hour < 15
        ? "morning"
        : "evening";
  return (
    <TodayExperience
      view={view}
      draft={buildDraft(view)}
      week={week}
      initialPhase={initialPhase}
    />
  );
}
