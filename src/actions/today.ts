"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/auth/session";
import { ACTIVITY_TYPES } from "@/lib/activities";
import {
  addActivity,
  chooseAction,
  removeActivity,
  saveCheckin,
  saveSteps,
} from "@/lib/db/today";
import { CHOSEN_ACTIONS } from "@/lib/decision/decision";
import { checkinSchema, parseHoursMinutes } from "@/lib/today/checkin";

export type ActionState = { status?: "saved" | "invalid" };

/** "" and missing → null, anything else → Number (NaN fails validation). */
function numberOrNull(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}

function textOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function done(): ActionState {
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/**
 * Saves the morning check-in, then the light and the decision are recomputed
 * in the same transaction. Symptoms arrive as `symptom.<id>` (severity or ""),
 * `symptomRest.<id>` and `symptomHr.<id>` for every id listed in `symptomIds`.
 */
export async function saveCheckinAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCurrentUser();
  const sleepMinutes = parseHoursMinutes(String(formData.get("sleep") ?? ""));
  if (sleepMinutes === undefined) return { status: "invalid" };

  const symptomIds = formData.getAll("symptomIds").map(String);
  const parsed = checkinSchema.safeParse({
    sleepMinutes,
    sleepScore: numberOrNull(formData.get("sleepScore")),
    rhr: numberOrNull(formData.get("rhr")),
    hrvMs: numberOrNull(formData.get("hrvMs")),
    hrvStatus: textOrNull(formData.get("hrvStatus")),
    energy: numberOrNull(formData.get("energy")),
    desire: numberOrNull(formData.get("desire")),
    legs: numberOrNull(formData.get("legs")),
    note: textOrNull(formData.get("note")),
    redFlags: formData.getAll("redFlags").map(String),
    symptoms: symptomIds.map((id) => ({
      symptomId: id,
      severity: numberOrNull(formData.get(`symptom.${id}`)),
      atRest: formData.get(`symptomRest.${id}`) === "on",
      heartRate: numberOrNull(formData.get(`symptomHr.${id}`)),
    })),
  });
  if (!parsed.success) return { status: "invalid" };
  await saveCheckin(parsed.data);
  return done();
}

const choiceSchema = z
  .object({
    chosen: z.enum(CHOSEN_ACTIONS),
    customText: z.string().trim().max(200).nullable(),
  })
  .refine((choice) => choice.chosen !== "custom" || choice.customText, {
    path: ["customText"],
  });

export async function chooseActionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCurrentUser();
  const parsed = choiceSchema.safeParse({
    chosen: formData.get("chosen"),
    customText: textOrNull(formData.get("customText")),
  });
  if (!parsed.success) return { status: "invalid" };
  const saved = await chooseAction(parsed.data.chosen, parsed.data.customText);
  return saved ? done() : { status: "invalid" };
}

const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  durationMin: z.number().int().min(1).max(1440).nullable(),
  rpe: z.number().int().min(1).max(10).nullable(),
});

export async function addActivityAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCurrentUser();
  const parsed = activitySchema.safeParse({
    type: formData.get("type"),
    durationMin: numberOrNull(formData.get("durationMin")),
    rpe: numberOrNull(formData.get("rpe")),
  });
  if (!parsed.success) return { status: "invalid" };
  await addActivity(parsed.data);
  return done();
}

export async function removeActivityAction(formData: FormData): Promise<void> {
  await requireCurrentUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await removeActivity(id.data);
  revalidatePath("/", "layout");
}

export async function saveStepsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCurrentUser();
  const steps = z
    .number()
    .int()
    .min(0)
    .max(100_000)
    .nullable()
    .safeParse(numberOrNull(formData.get("steps")));
  if (!steps.success) return { status: "invalid" };
  await saveSteps(steps.data);
  return done();
}
