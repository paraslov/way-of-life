"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/auth/session";
import { saveWeeklyReview, saveWeekMode } from "@/lib/db/week";
import { weeklyReviewSchema, weekModeSchema } from "@/lib/week/context";

export type WeekActionState = { status?: "saved" | "invalid" };

export async function saveWeekModeAction(
  _previous: WeekActionState,
  data: FormData,
): Promise<WeekActionState> {
  await requireCurrentUser();
  const mode = weekModeSchema.safeParse(data.get("mode"));
  if (!mode.success) return { status: "invalid" };
  await saveWeekMode(mode.data);
  revalidatePath("/week");
  return { status: "saved" };
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function saveWeeklyReviewAction(
  _previous: WeekActionState,
  data: FormData,
): Promise<WeekActionState> {
  await requireCurrentUser();
  const rawChange = data.get("changeNext");
  const review = weeklyReviewSchema.safeParse({
    helped: textOrNull(data.get("helped")),
    hurt: textOrNull(data.get("hurt")),
    changeNext: rawChange === "yes" ? true : rawChange === "no" ? false : null,
    changeText: textOrNull(data.get("changeText")),
  });
  if (!review.success) return { status: "invalid" };
  await saveWeeklyReview(review.data);
  revalidatePath("/week");
  return { status: "saved" };
}
