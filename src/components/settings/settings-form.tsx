"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { type SettingsState, saveSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSavedFlash } from "@/components/use-saved-flash";
import type { Settings } from "@/lib/settings";

/** IANA zones known to this browser; filled after mount to keep hydration stable. */
function supportedZones(current: string): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  let list: string[] = [];
  try {
    list = supported ? supported("timeZone") : [];
  } catch {
    list = [];
  }
  return list.includes(current) ? list : [current, ...list];
}

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    saveSettingsAction,
    {},
  );
  const { saved, flash } = useSavedFlash();
  const [zones, setZones] = useState<string[]>([settings.timezone]);

  useEffect(() => {
    setZones(supportedZones(settings.timezone));
  }, [settings.timezone]);

  useEffect(() => {
    if (state.status === "saved") flash();
  }, [state, flash]);

  return (
    <form
      action={formAction}
      className="grid gap-5 rounded-card border bg-background p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <Field
          id="timezone"
          label={t("settings.timezone")}
          help={t("settings.timezoneHelp")}
        >
          <select
            id="timezone"
            name="timezone"
            defaultValue={settings.timezone}
            aria-describedby="timezone-help"
            className="h-9 w-full rounded-input border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="lthr" label={t("settings.lthr")} help={t("settings.lthrHelp")}>
        <Input
          id="lthr"
          name="lthr"
          type="number"
          inputMode="numeric"
          required
          min={120}
          max={210}
          defaultValue={settings.lthr}
          aria-describedby="lthr-help"
        />
      </Field>
      <Field id="hrMax" label={t("settings.hrMax")}>
        <Input
          id="hrMax"
          name="hrMax"
          type="number"
          inputMode="numeric"
          required
          min={140}
          max={230}
          defaultValue={settings.hrMax}
        />
      </Field>
      <Field
        id="weightKg"
        label={t("settings.weightKg")}
        help={t("settings.weightHelp")}
      >
        <Input
          id="weightKg"
          name="weightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={250}
          defaultValue={settings.weightKg ?? ""}
          aria-describedby="weightKg-help"
        />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm leading-none font-medium">
          {t("settings.protein")}
        </legend>
        <div className="flex items-center gap-2">
          <Input
            name="proteinMinG"
            type="number"
            inputMode="numeric"
            required
            min={40}
            max={300}
            defaultValue={settings.proteinMinG}
            aria-label={`${t("settings.protein")}: ${t("settings.proteinMin")}`}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            name="proteinMaxG"
            type="number"
            inputMode="numeric"
            required
            min={40}
            max={300}
            defaultValue={settings.proteinMaxG}
            aria-label={`${t("settings.protein")}: ${t("settings.proteinMax")}`}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        {saved ? (
          <output className="inline-flex items-center gap-1 text-sm text-signal-green">
            <Check className="size-4" />
            {t("common.saved")}
          </output>
        ) : null}
        {state.status === "invalid" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("settings.invalid")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
