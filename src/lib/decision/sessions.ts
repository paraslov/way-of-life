/**
 * Sessions of the week template (docs/content/rules-v1.md → «Шаблон недели»).
 * The display name of each is `sessions.<code>` in the ru catalog.
 */
export const PLANNED_SESSIONS = [
  "strength_a",
  "strength_b",
  "easy_run",
  "intensity",
  "active_rest",
  "trek",
  "rest",
] as const;

export type PlannedSession = (typeof PLANNED_SESSIONS)[number];

/** Monday first, as `weekdayIndex` counts. */
export type WeekTemplate = readonly [
  PlannedSession,
  PlannedSession,
  PlannedSession,
  PlannedSession,
  PlannedSession,
  PlannedSession,
  PlannedSession,
];

/**
 * Mon strength A + power · Tue easy run + strides · Wed intensity (easy run if
 * the last one was under 7 days ago) · Thu strength B + power · Fri active rest
 * · Sat trek · Sun rest.
 */
export const DEFAULT_WEEK_TEMPLATE: WeekTemplate = [
  "strength_a",
  "easy_run",
  "intensity",
  "strength_b",
  "active_rest",
  "trek",
  "rest",
];
