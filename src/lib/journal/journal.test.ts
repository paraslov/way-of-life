import { describe, expect, it } from "vitest";
import { changedFromRecommendation } from "./journal";

describe("journal changed filter", () => {
  it("does not confuse a rule substitution with the user's choice", () => {
    expect(
      changedFromRecommendation("accept", "strength_a", "strength_lite"),
    ).toBe(false);
    expect(
      changedFromRecommendation("keep_original", "strength_a", "strength_lite"),
    ).toBe(true);
    expect(changedFromRecommendation("keep_original", "rest", "rest")).toBe(
      false,
    );
    expect(changedFromRecommendation("skip", "rest", "rest")).toBe(true);
    expect(changedFromRecommendation(null, "rest", "rest")).toBe(false);
  });
});
