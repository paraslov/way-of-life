import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    include: ["tests/db/**/*.test.ts"],
    hookTimeout: 20_000,
    testTimeout: 20_000,
    // One database: files must not interleave their users and rows.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      ...base.resolve?.alias,
      "server-only": fileURLToPath(
        new URL("./tests/db/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
