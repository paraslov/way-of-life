import { describe, expect, it } from "vitest";
import {
  blockDurationSeconds,
  MAX_PAIR_BLOCK_SECONDS,
  SOURCE_BLOCK_SECONDS,
} from "./throttle-policy";

describe("login throttle policy", () => {
  it("never blocks an account globally", () => {
    expect(blockDurationSeconds("account", 1_000)).toBe(0);
  });

  it("blocks a noisy source only after the source threshold", () => {
    expect(blockDurationSeconds("source", 19)).toBe(0);
    expect(blockDurationSeconds("source", 20)).toBe(SOURCE_BLOCK_SECONDS);
  });

  it("uses capped progressive backoff for an account/source pair", () => {
    expect(blockDurationSeconds("pair", 4)).toBe(0);
    expect(blockDurationSeconds("pair", 5)).toBe(1);
    expect(blockDurationSeconds("pair", 6)).toBe(2);
    expect(blockDurationSeconds("pair", 20)).toBe(MAX_PAIR_BLOCK_SECONDS);
  });
});
