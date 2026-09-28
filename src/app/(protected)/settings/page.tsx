import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { DeleteDataForm } from "@/components/settings/delete-data-form";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettings } from "@/lib/db/user-settings";
import { DELETE_CONFIRMATION, heartRateZones } from "@/lib/settings";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const settings = await getSettings();
  const zones = heartRateZones(settings.lthr);

  return (
    <div className="max-w-[720px]">
      <PageHeader title={t("title")} description={t("description")} />

      <section className="mt-8">
        <SectionTitle>{t("physiology")}</SectionTitle>
        <SettingsForm settings={settings} />
      </section>

      <section className="mt-8">
        <SectionTitle>{t("zones")}</SectionTitle>
        <div className="overflow-hidden rounded-card border bg-background">
          <table className="w-full text-sm">
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.zone} className="border-b last:border-b-0">
                  <th
                    scope="row"
                    className="w-14 px-4 py-2.5 text-left font-mono text-xs font-medium text-muted-foreground"
                  >
                    {t("zoneName", { zone: zone.zone })}
                  </th>
                  <td className="px-4 py-2.5">
                    {t(`zoneLabels.${zone.zone}`)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {zone.min === null
                      ? t("zoneBelow", { max: (zone.max ?? 0) + 1 })
                      : zone.max === null
                        ? t("zoneAbove", { min: zone.min - 1 })
                        : t("zoneRange", { min: zone.min, max: zone.max })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <SectionTitle>{t("data")}</SectionTitle>
        <div className="rounded-card border bg-background p-4">
          <h3 className="font-medium">{t("exportTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("exportBody")}
          </p>
          <a
            href="/settings/export"
            download
            className="mt-3 inline-flex h-9 items-center rounded-button border px-4 text-sm font-medium hover:bg-accent"
          >
            {t("exportAction")}
          </a>
        </div>
        <div className="rounded-card border border-signal-red-border bg-background p-4">
          <h3 className="font-medium">{t("deleteTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("deleteBody")}
          </p>
          <DeleteDataForm word={DELETE_CONFIRMATION} />
        </div>
      </section>
    </div>
  );
}
