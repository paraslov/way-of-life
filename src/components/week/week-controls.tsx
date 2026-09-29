"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  saveWeeklyReviewAction,
  saveWeekModeAction,
  type WeekActionState,
} from "@/actions/week";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WEEK_MODES,
  type WeeklyReviewRow,
  type WeekMode,
} from "@/lib/week/context";

export function WeekModeSwitch({ mode }: { mode: WeekMode }) {
  const t = useTranslations("week");
  const [state, action, pending] = useActionState<WeekActionState, FormData>(
    saveWeekModeAction,
    {},
  );
  return (
    <form
      action={action}
      aria-label={t("modeLabel")}
      className="flex flex-wrap rounded-input bg-accent p-[3px]"
    >
      {WEEK_MODES.map((value) => (
        <button
          key={value}
          type="submit"
          name="mode"
          value={value}
          disabled={pending}
          aria-pressed={mode === value}
          className={cn(
            "h-[34px] rounded-button px-3 text-[13px]",
            mode === value
              ? "bg-card font-medium shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {t(`modes.${value}`)}
        </button>
      ))}
      {state.status === "invalid" ? (
        <span role="alert" className="text-xs text-destructive">
          {t("invalidMode")}
        </span>
      ) : null}
    </form>
  );
}

export function WeeklyReviewForm({
  review,
  stats,
}: {
  review: WeeklyReviewRow | null;
  stats: { label: string; value: string }[];
}) {
  const t = useTranslations("week.review");
  const [state, action, pending] = useActionState<WeekActionState, FormData>(
    saveWeeklyReviewAction,
    {},
  );
  const [change, setChange] = useState<boolean | null>(
    review?.change_next ?? null,
  );
  return (
    <form action={action} className="space-y-3 rounded-card border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            {t("meta")}
          </p>
          <h2 className="mt-1 font-serif text-xl">{t("title")}</h2>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">{t("hint")}</p>
      <dl className="grid grid-cols-2 gap-2 rounded-input bg-field p-3 text-[13px]">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-muted-foreground">{stat.label}</dt>
            <dd className="font-mono">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <label className="block text-sm font-medium" htmlFor="review-helped">
        {t("helped")}
      </label>
      <textarea
        id="review-helped"
        name="helped"
        rows={2}
        maxLength={2000}
        defaultValue={review?.helped ?? ""}
        placeholder={t("helpedPlaceholder")}
        className="w-full rounded-input border bg-field px-3 py-2 text-base"
      />
      <label className="block text-sm font-medium" htmlFor="review-hurt">
        {t("hurt")}
      </label>
      <textarea
        id="review-hurt"
        name="hurt"
        rows={2}
        maxLength={2000}
        defaultValue={review?.hurt ?? ""}
        placeholder={t("hurtPlaceholder")}
        className="w-full rounded-input border bg-field px-3 py-2 text-base"
      />
      <p className="text-sm font-medium">{t("changeNext")}</p>
      <input
        type="hidden"
        name="changeNext"
        value={change === null ? "" : change ? "yes" : "no"}
      />
      <div className="flex gap-2">
        {([false, true] as const).map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={change === value}
            onClick={() => setChange(change === value ? null : value)}
            className={cn(
              "h-10 min-w-16 rounded-button border px-3 text-sm",
              change === value && "border-foreground font-semibold",
            )}
          >
            {value ? t("yes") : t("no")}
          </button>
        ))}
      </div>
      {change === true ? (
        <input
          name="changeText"
          maxLength={500}
          defaultValue={review?.change_text ?? ""}
          placeholder={t("changePlaceholder")}
          aria-label={t("changePlaceholder")}
          className="h-11 w-full rounded-input border bg-field px-3 text-base"
        />
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        {state.status === "saved" ? (
          <span className="text-sm text-signal-green">{t("saved")}</span>
        ) : null}
        {state.status === "invalid" ? (
          <span role="alert" className="text-sm text-destructive">
            {t("invalid")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
