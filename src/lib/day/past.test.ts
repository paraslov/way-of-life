import { describe, expect, it } from "vitest";
import { isEditablePastDay } from "@/lib/day/past";

describe("isEditablePastDay", () => {
  const today = "2026-10-08";

  it("allows yesterday through seven days ago", () => {
    expect(isEditablePastDay("2026-10-07", today)).toBe(true);
    expect(isEditablePastDay("2026-10-01", today)).toBe(true);
  });

  it("rejects today, the future and older days", () => {
    expect(isEditablePastDay(today, today)).toBe(false);
    expect(isEditablePastDay("2026-10-09", today)).toBe(false);
    expect(isEditablePastDay("2026-09-30", today)).toBe(false);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isEditablePastDay("2026-10-7", today)).toBe(false);
    expect(isEditablePastDay("2026-02-30", "2026-03-03")).toBe(false);
    expect(isEditablePastDay("", today)).toBe(false);
  });
});
