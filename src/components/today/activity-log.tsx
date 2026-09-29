"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import {
  type ActionState,
  addActivityAction,
  removeActivityAction,
  saveStepsAction,
} from "@/actions/today";
import { Segmented } from "@/components/today/controls";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activities";

const MINUTE_CHIPS = [10, 20, 30, 45, 60, 90];
const CATEGORY_DOT: Partial<Record<ActivityType, string>> = {
  strength: "bg-pine",
  strength_lite: "bg-pine",
  power_balance: "bg-pine",
  easy_run: "bg-slate",
  intensity: "bg-signal-red",
  trek: "bg-gold",
  mobility: "bg-gold",
};

export type LoggedActivity = {
  id: string;
  type: ActivityType;
  duration_min: number | null;
  rpe: number | null;
};

/** «Сделал» during the day (02.10): type, minutes, optional RPE — three taps. */
export function ActivityLog({
  activities,
  steps,
  showSteps = true,
}: {
  activities: LoggedActivity[];
  steps: number | null;
  showSteps?: boolean;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addActivityAction,
    {},
  );
  const [stepsState, stepsAction, stepsPending] = useActionState<
    ActionState,
    FormData
  >(saveStepsAction, {});
  const [type, setType] = useState<ActivityType | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);

  useEffect(() => {
    if (state.status === "saved") {
      setType(null);
      setMinutes(null);
      setRpe(null);
    }
  }, [state]);

  return (
    <section
      aria-labelledby="activity-title"
      className="space-y-4 rounded-card border bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <h2
          id="activity-title"
          className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
        >
          {t("activity.title")}
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground">
          {t("activity.touches")}
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
      ) : (
        <ul className="divide-y rounded-input border">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-[2px] ${CATEGORY_DOT[activity.type] ?? "bg-muted-foreground"}`}
                />
                <span>
                  {t(`activityTypes.${activity.type}`)}
                  <span className="text-muted-foreground">
                    {activity.duration_min
                      ? ` · ${t("activity.summary", { minutes: activity.duration_min })}`
                      : ""}
                    {activity.rpe
                      ? ` · ${t("activity.summaryRpe", { rpe: activity.rpe })}`
                      : ""}
                  </span>
                </span>
              </span>
              <form action={removeActivityAction}>
                <input type="hidden" name="id" value={activity.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label={t("activity.remove")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="type" value={type ?? ""} />
        <input type="hidden" name="durationMin" value={minutes ?? ""} />
        <input type="hidden" name="rpe" value={rpe ?? ""} />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("activity.type")}</p>
          <Segmented
            label={t("activity.type")}
            options={ACTIVITY_TYPES.map((value) => ({
              value,
              label: t(`activityTypes.${value}`),
            }))}
            value={type}
            onChange={setType}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="minutes" className="text-sm font-medium">
            {t("activity.minutes")}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <Segmented
              label={t("activity.minutes")}
              options={MINUTE_CHIPS.map((value) => ({
                value,
                label: String(value),
              }))}
              value={minutes}
              onChange={setMinutes}
            />
            <input
              id="minutes"
              inputMode="numeric"
              maxLength={3}
              className="h-11 w-20 rounded-input border bg-background text-center font-mono text-base"
              value={minutes ?? ""}
              placeholder={t("activity.customMinutes")}
              onChange={(event) => {
                const text = event.target.value.replace(/\D/g, "");
                setMinutes(text === "" ? null : Number(text));
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            {t("activity.rpe")}{" "}
            <span className="font-normal text-muted-foreground">
              {t("activity.rpeHint")}
            </span>
          </p>
          <Segmented
            label={t("activity.rpe")}
            options={Array.from({ length: 10 }, (_, i) => ({
              value: i + 1,
              label: String(i + 1),
            }))}
            value={rpe}
            onChange={setRpe}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || type === null}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("activity.add")}
          </Button>
          {state.status === "invalid" ? (
            <p role="alert" className="text-sm text-destructive">
              {t("activity.invalid")}
            </p>
          ) : null}
        </div>
      </form>

      {showSteps ? (
        <form
          action={stepsAction}
          className="flex flex-wrap items-end gap-2 border-t pt-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="steps" className="text-sm font-medium">
              {t("activity.steps")}
            </label>
            <input
              id="steps"
              name="steps"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={steps ?? ""}
              className="h-11 w-32 rounded-input border bg-background px-3 font-mono text-base"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-11"
            disabled={stepsPending}
          >
            {t("activity.stepsSave")}
          </Button>
          {stepsState.status === "saved" ? (
            <output className="pb-3 text-sm text-signal-green">
              {t("common.saved")}
            </output>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
