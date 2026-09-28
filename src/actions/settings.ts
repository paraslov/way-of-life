"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/auth/session";
import { deleteUserData } from "@/lib/db/user-data";
import { updateSettings } from "@/lib/db/user-settings";
import { DELETE_CONFIRMATION, physiologySchema } from "@/lib/settings";

export type SettingsState = { status?: "saved" | "invalid" };

const numberField = (value: FormDataEntryValue | null) =>
  value === null || value === "" ? null : Number(value);

/** Saves the physiology form. Validates the whole set, then merges it. */
export async function saveSettingsAction(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireCurrentUser();
  const parsed = physiologySchema.safeParse({
    timezone: formData.get("timezone"),
    lthr: numberField(formData.get("lthr")),
    hrMax: numberField(formData.get("hrMax")),
    weightKg: numberField(formData.get("weightKg")),
    rhrStartBaseline: numberField(formData.get("rhrStartBaseline")),
    proteinMinG: numberField(formData.get("proteinMinG")),
    proteinMaxG: numberField(formData.get("proteinMaxG")),
  });
  if (!parsed.success) return { status: "invalid" };
  await updateSettings(parsed.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export type DeleteState = { status?: "deleted" | "unconfirmed" };

/** Deletes every user-owned row after the confirmation word is typed. */
export async function deleteAllDataAction(
  _previous: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireCurrentUser();
  const confirmation = z.string().safeParse(formData.get("confirmation"));
  if (confirmation.data?.trim() !== DELETE_CONFIRMATION) {
    return { status: "unconfirmed" };
  }
  await deleteUserData();
  revalidatePath("/", "layout");
  return { status: "deleted" };
}
