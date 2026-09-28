"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { type ActionState, chooseActionAction } from "@/actions/today";
import { Button } from "@/components/ui/button";
import { CHOSEN_ACTIONS, type ChosenAction } from "@/lib/decision/decision";
import { cn } from "@/lib/utils";

/**
 * The plan, the recommendation and the user's answer (02.9). The
 * recommendation is a suggestion: all four answers look the same, and none is
 * presented as the right one.
 */
export function DecisionCard({
  planned,
  recommended,
  reason,
  note,
  chosen,
  customText,
}: {
  planned: string;
  recommended: string;
  reason: string;
  note: string | null;
  chosen: ChosenAction | null;
  customText: string | null;
}) {
  const t = useTranslations("decision");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    chooseActionAction,
    {},
  );
  const [custom, setCustom] = useState(chosen === "custom");

  return (
    <section
      aria-labelledby="decision-title"
      className="rounded-card border bg-background p-4"
    >
      <h2
        id="decision-title"
        className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
      >
        {t("title")}
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">{t("planned")}</dt>
        <dd>{planned}</dd>
        <dt className="text-muted-foreground">{t("recommended")}</dt>
        <dd className="font-medium">{recommended}</dd>
      </dl>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
      {note ? (
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-3">
        <p className="text-sm">{t("chooseHint")}</p>
        <div className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
          {CHOSEN_ACTIONS.map((action) => {
            const selected = chosen === action;
            return action === "custom" ? (
              <Button
                key={action}
                type="button"
                variant="outline"
                aria-pressed={selected}
                className={cn(
                  "h-11",
                  selected && "border-foreground ring-1 ring-foreground",
                )}
                onClick={() => setCustom(true)}
              >
                {t(`choices.${action}`)}
              </Button>
            ) : (
              <Button
                key={action}
                type="submit"
                name="chosen"
                value={action}
                variant="outline"
                aria-pressed={selected}
                disabled={pending}
                className={cn(
                  "h-11",
                  selected && "border-foreground ring-1 ring-foreground",
                )}
              >
                {t(`choices.${action}`)}
              </Button>
            );
          })}
        </div>
        {custom ? (
          <div className="flex gap-2">
            <input
              name="customText"
              aria-label={t("customPlaceholder")}
              placeholder={t("customPlaceholder")}
              maxLength={200}
              defaultValue={customText ?? ""}
              className="h-11 min-w-0 flex-1 rounded-input border bg-background px-3 text-base"
            />
            <Button
              type="submit"
              name="chosen"
              value="custom"
              className="h-11"
              disabled={pending}
            >
              {t("customSave")}
            </Button>
          </div>
        ) : null}
        <div className="min-h-5 text-sm">
          {pending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : state.status === "invalid" ? (
            <p role="alert" className="text-destructive">
              {t("invalid")}
            </p>
          ) : chosen ? (
            <output className="text-muted-foreground">
              {t("chosen", {
                choice:
                  chosen === "custom" && customText
                    ? customText
                    : t(`choices.${chosen}`),
              })}
            </output>
          ) : null}
        </div>
      </form>
    </section>
  );
}
