import { dateToId, daysBetween, idToDate } from "@/lib/date";

/** How many days back a missed day can still be filled in (D27). */
export const EDIT_WINDOW_DAYS = 7;

const DAY_ID = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Yesterday up to `EDIT_WINDOW_DAYS` days ago. Today is edited on «Сегодня»,
 * where the decision is still open; older days stay as they were.
 */
export function isEditablePastDay(date: string, today: string): boolean {
  if (!DAY_ID.test(date) || dateToId(idToDate(date)) !== date) return false;
  const age = daysBetween(today, date);
  return age >= 1 && age <= EDIT_WINDOW_DAYS;
}
