export const THROTTLE_WINDOW_SECONDS = 10 * 60;
export const SOURCE_FAILURE_LIMIT = 20;
export const SOURCE_BLOCK_SECONDS = 15 * 60;
export const PAIR_FAILURE_LIMIT = 5;
export const MAX_PAIR_BLOCK_SECONDS = 60;

export type ThrottleScope = "account" | "source" | "pair";

export function blockDurationSeconds(
  scope: ThrottleScope,
  failureCount: number,
) {
  if (scope === "source") {
    return failureCount >= SOURCE_FAILURE_LIMIT ? SOURCE_BLOCK_SECONDS : 0;
  }

  if (scope === "pair" && failureCount >= PAIR_FAILURE_LIMIT) {
    return Math.min(
      2 ** (failureCount - PAIR_FAILURE_LIMIT),
      MAX_PAIR_BLOCK_SECONDS,
    );
  }

  // Account-wide counts are monitoring signals only. They never prevent a
  // legitimate user from signing in from another source.
  return 0;
}
