import { describe, expect, it } from "vitest";
import { redact } from "./log";

describe("redact", () => {
  it("keeps only allowlisted operational fields", () => {
    expect(
      redact({
        scope: "pair",
        failureCount: 5,
        rhr: 57,
        note: "перебои после плохой ночи",
        palpitations: true,
      }),
    ).toEqual({ scope: "pair", failureCount: 5 });
  });

  it("drops objects and long strings even under an allowed key", () => {
    expect(redact({ key: { rhr: 57 }, code: "x".repeat(65) })).toEqual({});
  });
});
