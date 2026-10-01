"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { type ActionState, saveEveningAction } from "@/actions/today";
import { FieldRow, Segmented, Stepper } from "@/components/today/controls";
import { Button } from "@/components/ui/button";
import { useSavedFlash } from "@/components/use-saved-flash";
import {
  BEDTIME_TARGETS,
  DECISION_FITS,
  type EveningRow,
  FIBER_BANDS,
  MOODS,
  PROTEIN_BANDS,
} from "@/lib/day/evening";

export function EveningForm({
  evening,
  steps,
  chosen,
  date,
  showDecisionFit = true,
}: {
  evening: EveningRow | null;
  steps: number | null;
  chosen: string | null;
  /** A finished day being filled in (D27). */
  date?: string;
  /** Hidden for a day that had no decision to assess. */
  showDecisionFit?: boolean;
}) {
  const t = useTranslations("evening");
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveEveningAction,
    {},
  );
  const { saved, flash } = useSavedFlash();
  const [values, setValues] = useState({
    steps,
    walkAfterMeal: evening?.walk_after_meal ?? null,
    proteinBand: evening?.protein_band ?? null,
    fiberBand: evening?.fiber_band ?? null,
    bedtimeTarget: evening?.bedtime_target ?? null,
    decisionFit: evening?.decision_fit ?? null,
    mood: evening?.mood ?? null,
    note: evening?.note ?? "",
  });
  useEffect(() => {
    if (state.status === "saved") flash();
  }, [state, flash]);

  return (
    <form action={action} className="space-y-3 rounded-card border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
          {t("time")}
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground">{t("hint")}</p>
      {date ? <input type="hidden" name="date" value={date} /> : null}
      <input type="hidden" name="steps" value={values.steps ?? ""} />
      <input
        type="hidden"
        name="walkAfterMeal"
        value={values.walkAfterMeal ?? ""}
      />
      <input
        type="hidden"
        name="proteinBand"
        value={values.proteinBand ?? ""}
      />
      <input type="hidden" name="fiberBand" value={values.fiberBand ?? ""} />
      <input
        type="hidden"
        name="bedtimeTarget"
        value={values.bedtimeTarget ?? ""}
      />
      <input
        type="hidden"
        name="decisionFit"
        value={values.decisionFit ?? ""}
      />
      <input type="hidden" name="mood" value={values.mood ?? ""} />
      <div className="divide-y rounded-input border px-4">
        <FieldRow label={t("steps")} htmlFor="evening-steps">
          <Stepper
            id="evening-steps"
            value={values.steps}
            min={0}
            max={100000}
            start={8000}
            step={500}
            onChange={(steps) => setValues((v) => ({ ...v, steps }))}
          />
        </FieldRow>
        <FieldRow label={t("mood")}>
          <Segmented
            label={t("mood")}
            options={MOODS.map((value) => ({
              value,
              label: t(`moods.${value}`),
            }))}
            value={values.mood}
            onChange={(mood) => setValues((v) => ({ ...v, mood }))}
          />
        </FieldRow>
        <FieldRow label={t("walkAfterMeal")}>
          <Segmented
            label={t("walkAfterMeal")}
            options={[0, 1, 2, 3].map((value) => ({
              value,
              label: value === 3 ? "3+" : String(value),
            }))}
            value={values.walkAfterMeal}
            onChange={(walkAfterMeal) =>
              setValues((v) => ({ ...v, walkAfterMeal }))
            }
          />
        </FieldRow>
        <FieldRow label={t("protein")}>
          <Segmented
            label={t("protein")}
            options={PROTEIN_BANDS.map((value) => ({
              value,
              label: t(`proteinBands.${value}`),
            }))}
            value={values.proteinBand}
            onChange={(proteinBand) =>
              setValues((v) => ({ ...v, proteinBand }))
            }
          />
        </FieldRow>
        <FieldRow label={t("fiber")}>
          <Segmented
            label={t("fiber")}
            options={FIBER_BANDS.map((value) => ({
              value,
              label: t(`fiberBands.${value}`),
            }))}
            value={values.fiberBand}
            onChange={(fiberBand) => setValues((v) => ({ ...v, fiberBand }))}
          />
        </FieldRow>
        <FieldRow label={t("bedtime")}>
          <Segmented
            label={t("bedtime")}
            options={BEDTIME_TARGETS.map((value) => ({
              value,
              label: t(`bedtimeTargets.${value}`),
            }))}
            value={values.bedtimeTarget}
            onChange={(bedtimeTarget) =>
              setValues((v) => ({ ...v, bedtimeTarget }))
            }
          />
        </FieldRow>
        {showDecisionFit ? (
          <FieldRow
            label={t("decisionFit")}
            hint={
              chosen ? (
                <span className="text-xs text-muted-foreground">{chosen}</span>
              ) : null
            }
          >
            <Segmented
              label={t("decisionFit")}
              options={DECISION_FITS.map((value) => ({
                value,
                label: t(`decisionFits.${value}`),
              }))}
              value={values.decisionFit}
              onChange={(decisionFit) =>
                setValues((v) => ({ ...v, decisionFit }))
              }
            />
          </FieldRow>
        ) : null}
      </div>
      <label htmlFor="evening-note" className="block text-sm font-medium">
        {t("note")}
      </label>
      <textarea
        id="evening-note"
        name="note"
        rows={2}
        maxLength={2000}
        className="w-full rounded-input border bg-field px-3 py-2 text-base"
        placeholder={t("notePlaceholder")}
        value={values.note}
        onChange={(event) =>
          setValues((v) => ({ ...v, note: event.target.value }))
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("save")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {saved ? t("saved") : date ? null : t("canEdit")}
        </span>
        {state.status === "invalid" ? (
          <span role="alert" className="text-sm text-destructive">
            {t("invalid")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
