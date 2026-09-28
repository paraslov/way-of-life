"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type DeleteState, deleteAllDataAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteDataForm({ word }: { word: string }) {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(
    deleteAllDataAction,
    {},
  );

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <Label htmlFor="confirmation">{t("deletePrompt", { word })}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="confirmation"
          name="confirmation"
          autoComplete="off"
          className="max-w-[220px]"
          disabled={pending}
        />
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("deleteAction")}
        </Button>
      </div>
      {state.status === "unconfirmed" ? (
        <p role="alert" className="text-sm text-destructive">
          {t("deleteUnconfirmed")}
        </p>
      ) : null}
      {state.status === "deleted" ? (
        <output className="block text-sm text-muted-foreground">
          {t("deleted")}
        </output>
      ) : null}
    </form>
  );
}
