import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";

export type PlaceholderPage =
  | "week"
  | "journal"
  | "strength"
  | "metrics"
  | "horizon"
  | "medical"
  | "tasks"
  | "reference";

/** A section that exists in the navigation before its stage is built. */
export async function PagePlaceholder({
  page,
  stage,
}: {
  page: PlaceholderPage;
  stage: string;
}) {
  const t = await getTranslations();

  return (
    <>
      <PageHeader title={t(`nav.${page}`)} description={t(`pages.${page}`)} />
      <p className="mt-6 max-w-[62ch] rounded-card border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
        {t("pages.comingIn", { stage })}
      </p>
    </>
  );
}
