import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    include: ["tests/db/**/*.test.ts"],
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
});
