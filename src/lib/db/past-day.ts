import "server-only";

import type { PoolClient } from "pg";
import { todayId } from "@/lib/date";
import type { EveningInput } from "@/lib/day/evening";
import { isEditablePastDay } from "@/lib/day/past";
import { saveEveningFor } from "@/lib/db/evening";
import {
  type ActivityInput,
  addActivityFor,
  loadTodayFor,
  saveLateCheckinFor,
  type TodayView,
} from "@/lib/db/today";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { readSettings } from "@/lib/db/user-settings";
import type { CheckinInput } from "@/lib/today/checkin";

/**
 * Filling in a finished day (D27): the same day data as «Сегодня», but only
 * for a day inside the edit window and never touching its decision.
 */

async function onEditablePastDay<T>(
  date: string,
  callback: (client: PoolClient, userId: string) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  return withCurrentUserDb(async (client, userId) => {
    const settings = await readSettings(client, userId);
    if (!isEditablePastDay(date, todayId(settings.timezone))) {
      return { ok: false };
    }
    return { ok: true, value: await callback(client, userId) };
  });
}

/** The day's data for the fill-in dialog, or null outside the edit window. */
export async function getPastDayView(date: string): Promise<TodayView | null> {
  const result = await onEditablePastDay(date, (client, userId) =>
    loadTodayFor(client, userId, date),
  );
  return result.ok ? result.value : null;
}

export async function saveLateCheckin(date: string, input: CheckinInput) {
  const result = await onEditablePastDay(date, (client, userId) =>
    saveLateCheckinFor(client, userId, date, input),
  );
  return result.ok;
}

export async function saveLateEvening(date: string, input: EveningInput) {
  const result = await onEditablePastDay(date, (client, userId) =>
    saveEveningFor(client, userId, date, input),
  );
  return result.ok;
}

export async function addLateActivity(date: string, activity: ActivityInput) {
  const result = await onEditablePastDay(date, (client, userId) =>
    addActivityFor(client, userId, date, activity),
  );
  return result.ok;
}
