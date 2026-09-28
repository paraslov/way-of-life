/**
 * Day-id helpers. A "day id" is a `YYYY-MM-DD` string in the user's own time
 * zone (`user_settings.settings.timezone`, `Asia/Almaty` by default); all
 * arithmetic is done in UTC off that string. Daily records are keyed by it, so
 * "today" is always the user's calendar day (architecture §7).
 */
export const DEFAULT_TIMEZONE = "Asia/Almaty";

const MS_PER_DAY = 86_400_000;

/** True when `value` is an IANA zone this runtime accepts; guards user input. */
export function isTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** A valid zone unchanged, otherwise the default. */
export function normalizeTimeZone(value: string | null | undefined): string {
  return isTimeZone(value) ? value : DEFAULT_TIMEZONE;
}

/** The `YYYY-MM-DD` calendar day that `date` falls on in `timeZone`. */
export function zonedDayId(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Parses a `YYYY-MM-DD` id into a UTC `Date` at midnight. */
export function idToDate(id: string): Date {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formats a UTC `Date` back into a `YYYY-MM-DD` id. */
export function dateToId(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}`;
}

/** Returns the id `delta` days from `id` (delta may be negative). */
export function shiftId(id: string, delta: number): string {
  const dt = idToDate(id);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dateToId(dt);
}

/** Whole days from `b` to `a` (`a - b`); positive when `a` is later. */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (idToDate(a).getTime() - idToDate(b).getTime()) / MS_PER_DAY,
  );
}

/** The current calendar day id in the given time zone. */
export function todayId(timeZone: string = DEFAULT_TIMEZONE): string {
  return zonedDayId(new Date(), timeZone);
}

/** «понедельник, 28 сентября» — long day title. */
export function formatDayTitle(id: string): string {
  return new Intl.DateTimeFormat("ru", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(idToDate(id));
}
