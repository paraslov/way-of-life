"use client";

import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Check-in controls built for one thumb on a 375 px screen: large targets,
 * steppers instead of typing, and an explicit «—» for "not entered" so an
 * empty value reads as UNKNOWN rather than as zero.
 */

export function FieldRow({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
      <div className="flex items-center gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <span className="text-sm font-medium">{label}</span>
        )}
        {hint}
      </div>
      {children}
    </div>
  );
}

/** Small tag for a value still carried over from the previous morning. */
export function FromYesterday({ show }: { show: boolean }) {
  const t = useTranslations("today");
  if (!show) return null;
  return (
    <span className="rounded-chip border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {t("fromYesterday")}
    </span>
  );
}

const stepButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-button border bg-background text-foreground hover:bg-accent disabled:opacity-40";

export function Stepper({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  start,
  unit,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step?: number;
  /** The first value a tap on an empty stepper sets. */
  start: number;
  unit?: string;
}) {
  const t = useTranslations("today");
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={stepButton}
        aria-label={t("decrease")}
        disabled={value !== null && value <= min}
        onClick={() => onChange(value === null ? start : clamp(value - step))}
      >
        <Minus className="size-4" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        className="h-11 w-20 rounded-input border bg-background text-center font-mono text-base tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value ?? ""}
        placeholder={t("notEntered")}
        onChange={(event) => {
          const text = event.target.value.replace(/\D/g, "");
          onChange(text === "" ? null : Math.min(max, Number(text)));
        }}
      />
      <button
        type="button"
        className={stepButton}
        aria-label={t("increase")}
        disabled={value !== null && value >= max}
        onClick={() => onChange(value === null ? start : clamp(value + step))}
      >
        <Plus className="size-4" />
      </button>
      {unit ? (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {unit}
        </span>
      ) : null}
      <ClearButton visible={value !== null} onClear={() => onChange(null)} />
    </div>
  );
}

export function ClearButton({
  visible,
  onClear,
}: {
  visible: boolean;
  onClear: () => void;
}) {
  const t = useTranslations("today");
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-button text-muted-foreground hover:bg-accent",
        !visible && "invisible",
      )}
      aria-label={t("notEnteredLabel")}
      title={t("notEnteredLabel")}
      onClick={onClear}
    >
      <X className="size-4" />
    </button>
  );
}

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
};

/** A radio group of buttons; tapping the chosen option again clears it. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a button radio lets a second tap clear the value.
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              "h-11 min-w-11 rounded-button border px-3 text-sm",
              selected
                ? "border-foreground bg-foreground text-background"
                : "bg-background hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
