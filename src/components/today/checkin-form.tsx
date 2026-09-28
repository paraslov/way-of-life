"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { type ActionState, saveCheckinAction } from "@/actions/today";
import {
  ClearButton,
  FieldRow,
  FromYesterday,
  Segmented,
  Stepper,
} from "@/components/today/controls";
import { Button } from "@/components/ui/button";
import { useSavedFlash } from "@/components/use-saved-flash";
import { RED_FLAGS } from "@/lib/decision/decision";
import { HRV_STATUSES } from "@/lib/metrics/registry";
import type { CheckinDraft, SymptomDraft } from "@/lib/today/draft";

type Field = Exclude<keyof CheckinDraft, "symptoms" | "fromPrevious">;

const SECTION =
  "divide-y rounded-card border bg-background px-4 min-[480px]:px-5";

function SymptomRow({
  symptom,
  onChange,
}: {
  symptom: SymptomDraft;
  onChange: (next: SymptomDraft) => void;
}) {
  const t = useTranslations("today");
  const id = `symptom-${symptom.id}`;

  if (symptom.scale === "bool") {
    return (
      <FieldRow label={symptom.name}>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label={symptom.name}
            options={[
              { value: 0, label: t("no") },
              { value: 1, label: t("yes") },
            ]}
            value={symptom.severity}
            onChange={(severity) => onChange({ ...symptom, severity })}
          />
          {symptom.key === "palpitations" && symptom.severity === 1 ? (
            <input
              aria-label={t("heartRate")}
              placeholder={t("heartRate")}
              inputMode="numeric"
              className="h-11 w-20 rounded-input border bg-background text-center font-mono text-base"
              value={symptom.heartRate ?? ""}
              onChange={(event) => {
                const text = event.target.value.replace(/\D/g, "");
                onChange({
                  ...symptom,
                  heartRate: text === "" ? null : Number(text),
                });
              }}
            />
          ) : null}
        </div>
      </FieldRow>
    );
  }

  return (
    <FieldRow label={symptom.name} htmlFor={id}>
      <div className="flex flex-wrap items-center gap-2">
        <Stepper
          id={id}
          value={symptom.severity}
          min={0}
          max={10}
          start={0}
          unit={t("unitOfTen")}
          onChange={(severity) => onChange({ ...symptom, severity })}
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4"
            checked={symptom.atRest}
            onChange={(event) =>
              onChange({ ...symptom, atRest: event.target.checked })
            }
          />
          {t("atRest")}
        </label>
      </div>
    </FieldRow>
  );
}

/**
 * Morning check-in (02.8). Prefilled from the previous morning so a usual day
 * is a few taps; «как вчера» marks what has not been confirmed today.
 */
export function CheckinForm({
  draft,
  allSymptoms,
  startCollapsed,
  rhrStart,
}: {
  draft: CheckinDraft;
  /** Where the empty RHR stepper starts: the user's baseline. */
  rhrStart: number;
  allSymptoms: Omit<SymptomDraft, "severity" | "atRest" | "heartRate">[];
  startCollapsed: boolean;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveCheckinAction,
    {},
  );
  const { saved, flash } = useSavedFlash();
  const [open, setOpen] = useState(!startCollapsed);
  const [values, setValues] = useState(draft);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (state.status === "saved") {
      flash();
      setTouched(new Set());
      setOpen(false);
    }
  }, [state, flash]);

  function set<K extends Field>(field: K, value: CheckinDraft[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setTouched((current) => new Set(current).add(field));
  }

  function setSymptom(next: SymptomDraft) {
    setValues((current) => ({
      ...current,
      symptoms: current.symptoms.map((s) => (s.id === next.id ? next : s)),
    }));
    setTouched((current) => new Set(current).add(next.id));
  }

  const carried = (field: string) => draft.fromPrevious && !touched.has(field);
  const addable = allSymptoms.filter(
    (symptom) => !values.symptoms.some((s) => s.id === symptom.id),
  );
  const scale = (key: "desireLevels" | "legsLevels") =>
    ([1, 2, 3] as const).map((value) => ({
      value,
      label: t(`today.${key}.${value}`),
    }));

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {t("today.editCheckin")}
          <ChevronDown className="size-4" />
        </Button>
        {saved ? (
          <output className="inline-flex items-center gap-1 text-sm text-signal-green">
            <Check className="size-4" />
            {t("common.saved")}
          </output>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {draft.fromPrevious ? (
        <p className="text-sm text-muted-foreground">
          {t("today.checkinHint")}
        </p>
      ) : null}

      <input type="hidden" name="sleepScore" value={values.sleepScore ?? ""} />
      <input type="hidden" name="rhr" value={values.rhr ?? ""} />
      <input type="hidden" name="hrvMs" value={values.hrvMs ?? ""} />
      <input type="hidden" name="hrvStatus" value={values.hrvStatus ?? ""} />
      <input type="hidden" name="energy" value={values.energy ?? ""} />
      <input type="hidden" name="desire" value={values.desire ?? ""} />
      <input type="hidden" name="legs" value={values.legs ?? ""} />
      {values.redFlags.map((flag) => (
        <input key={flag} type="hidden" name="redFlags" value={flag} />
      ))}
      {values.symptoms.map((symptom) => (
        <span key={symptom.id} hidden>
          <input type="hidden" name="symptomIds" value={symptom.id} />
          <input
            type="hidden"
            name={`symptom.${symptom.id}`}
            value={symptom.severity ?? ""}
          />
          {symptom.atRest ? (
            <input
              type="hidden"
              name={`symptomRest.${symptom.id}`}
              value="on"
            />
          ) : null}
          <input
            type="hidden"
            name={`symptomHr.${symptom.id}`}
            value={symptom.heartRate ?? ""}
          />
        </span>
      ))}

      <div className={SECTION}>
        <FieldRow
          label={t("today.sleep")}
          htmlFor="sleep"
          hint={
            <FromYesterday show={carried("sleep") && values.sleep !== ""} />
          }
        >
          <div className="flex items-center gap-1.5">
            <input
              id="sleep"
              name="sleep"
              inputMode="decimal"
              autoComplete="off"
              placeholder={t("today.sleepPlaceholder")}
              className="h-11 w-24 rounded-input border bg-background text-center font-mono text-base tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              value={values.sleep}
              onChange={(event) => set("sleep", event.target.value)}
            />
            <ClearButton
              visible={values.sleep !== ""}
              onClear={() => set("sleep", "")}
            />
          </div>
        </FieldRow>
        <FieldRow
          label={t("today.rhr")}
          htmlFor="rhr"
          hint={<FromYesterday show={carried("rhr") && values.rhr !== null} />}
        >
          <Stepper
            id="rhr"
            value={values.rhr}
            min={30}
            max={120}
            start={rhrStart}
            unit={t("today.unitBpm")}
            onChange={(value) => set("rhr", value ?? null)}
          />
        </FieldRow>
        <FieldRow
          label={t("today.hrvStatus")}
          hint={
            <FromYesterday
              show={carried("hrvStatus") && values.hrvStatus !== null}
            />
          }
        >
          <Segmented
            label={t("today.hrvStatus")}
            options={HRV_STATUSES.map((status) => ({
              value: status,
              label: t(`hrvStatus.${status}`),
            }))}
            value={values.hrvStatus}
            onChange={(value) => set("hrvStatus", value)}
          />
        </FieldRow>
      </div>

      <div className={SECTION}>
        <FieldRow
          label={t("today.energy")}
          hint={
            <FromYesterday show={carried("energy") && values.energy !== null} />
          }
        >
          <Segmented
            label={t("today.energy")}
            options={[1, 2, 3, 4, 5].map((value) => ({
              value,
              label: String(value),
            }))}
            value={values.energy}
            onChange={(value) => set("energy", value)}
          />
        </FieldRow>
        <FieldRow
          label={t("today.desire")}
          hint={
            <FromYesterday show={carried("desire") && values.desire !== null} />
          }
        >
          <Segmented
            label={t("today.desire")}
            options={scale("desireLevels")}
            value={values.desire}
            onChange={(value) => set("desire", value)}
          />
        </FieldRow>
        <FieldRow
          label={t("today.legs")}
          hint={
            <FromYesterday show={carried("legs") && values.legs !== null} />
          }
        >
          <Segmented
            label={t("today.legs")}
            options={scale("legsLevels")}
            value={values.legs}
            onChange={(value) => set("legs", value)}
          />
        </FieldRow>
      </div>

      <div className={SECTION}>
        <h3 className="pt-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {t("today.symptoms")}
        </h3>
        {values.symptoms.map((symptom) => (
          <SymptomRow
            key={symptom.id}
            symptom={symptom}
            onChange={setSymptom}
          />
        ))}
        {addable.length > 0 ? (
          <div className="py-3">
            <select
              aria-label={t("today.addSymptom")}
              className="h-11 rounded-input border bg-background px-3 text-sm"
              value=""
              onChange={(event) => {
                const symptom = addable.find(
                  (s) => s.id === event.target.value,
                );
                if (!symptom) return;
                setValues((current) => ({
                  ...current,
                  symptoms: [
                    ...current.symptoms,
                    {
                      ...symptom,
                      severity: symptom.scale === "bool" ? 1 : null,
                      atRest: false,
                      heartRate: null,
                    },
                  ],
                }));
              }}
            >
              <option value="">{t("today.addSymptom")}</option>
              {addable.map((symptom) => (
                <option key={symptom.id} value={symptom.id}>
                  {symptom.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <details className="rounded-card border bg-background px-4 min-[480px]:px-5">
        <summary className="cursor-pointer py-3 text-sm font-medium">
          {t("today.more")}
        </summary>
        <div className="divide-y border-t">
          <FieldRow label={t("today.sleepScore")} htmlFor="sleepScoreInput">
            <Stepper
              id="sleepScoreInput"
              value={values.sleepScore}
              min={0}
              max={100}
              start={80}
              onChange={(value) => set("sleepScore", value)}
            />
          </FieldRow>
          <FieldRow label={t("today.hrvMs")} htmlFor="hrvMsInput">
            <Stepper
              id="hrvMsInput"
              value={values.hrvMs}
              min={5}
              max={250}
              start={50}
              unit={t("today.unitMs")}
              onChange={(value) => set("hrvMs", value)}
            />
          </FieldRow>
          <div className="space-y-1.5 py-3">
            <label htmlFor="note" className="text-sm font-medium">
              {t("today.note")}
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              maxLength={2000}
              className="w-full rounded-input border bg-background px-3 py-2 text-base"
              value={values.note}
              onChange={(event) => set("note", event.target.value)}
            />
          </div>
        </div>
      </details>

      <details
        className="rounded-card border border-signal-red-border bg-background px-4 min-[480px]:px-5"
        open={values.redFlags.length > 0}
      >
        <summary className="cursor-pointer py-3 text-sm font-medium">
          {t("today.redFlagsTitle")}
        </summary>
        <div className="space-y-2 border-t py-3">
          <p className="text-xs text-muted-foreground">
            {t("today.redFlagsHint")}
          </p>
          {RED_FLAGS.map((flag) => (
            <label key={flag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={values.redFlags.includes(flag)}
                onChange={(event) =>
                  set(
                    "redFlags",
                    event.target.checked
                      ? [...values.redFlags, flag]
                      : values.redFlags.filter((f) => f !== flag),
                  )
                }
              />
              {t(`redFlags.${flag}`)}
            </label>
          ))}
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? t("common.saving") : t("today.saveCheckin")}
        </Button>
        {startCollapsed ? (
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("today.hideCheckin")}
          </Button>
        ) : null}
        {state.status === "invalid" ? (
          <p role="alert" className="text-sm text-destructive">
            {t("today.invalid")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
