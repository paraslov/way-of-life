import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import ru from "./messages/ru.json";

function flatten(
  messages: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string"
        ? [[path, value]]
        : Object.entries(flatten(value as Record<string, unknown>, path));
    }),
  );
}

describe("ru catalog", () => {
  it("has no empty messages", () => {
    for (const [key, value] of Object.entries(flatten(ru))) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("formats every message with its ICU arguments", () => {
    const t = createTranslator({
      locale: "ru",
      messages: ru,
      onError: (error) => {
        throw error;
      },
    });
    for (const [key, message] of Object.entries(flatten(ru))) {
      const values: Record<string, number> = {};
      for (const match of message.matchAll(/\{(\w+)[,}]/g)) {
        values[match[1]] = 2;
      }
      expect(t(key as Parameters<typeof t>[0], values), key).toBeTruthy();
    }
  });

  // The traffic light shows a verdict with reasons, never a score (D7), and
  // nothing here is gamified.
  it.each([
    ["a readiness score", /readiness|готовност\S* \d/i],
    ["a streak", /\bstreak\b|серия|подряд без пропусков/i],
  ])("keeps %s out of the catalog", (_label, pattern) => {
    for (const [key, value] of Object.entries(flatten(ru))) {
      expect(value, key).not.toMatch(pattern);
    }
  });

  it("keeps percentages out of the daily traffic light", () => {
    for (const [key, value] of Object.entries(flatten(ru))) {
      if (key.startsWith("light.") || key.startsWith("decision.")) {
        expect(value, key).not.toMatch(/\d+ ?%/);
      }
    }
  });
});
