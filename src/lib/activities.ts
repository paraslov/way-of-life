/**
 * Activity types of the quick «сделал» log (02.10), matching the database
 * check on `activities.type`. Names are `activityTypes.<type>` in the catalog.
 */
export const ACTIVITY_TYPES = [
  "easy_run",
  "intensity",
  "strength",
  "strength_lite",
  "power_balance",
  "mobility",
  "trek",
  "walk",
  "walk_after_meal",
  "rest",
  "other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
