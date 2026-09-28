import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects another password", async () => {
    const hash = await hashPassword("a secure example password");

    await expect(
      verifyPassword("a secure example password", hash),
    ).resolves.toBe(true);
    await expect(verifyPassword("not the password", hash)).resolves.toBe(false);
  });

  it("rejects malformed password hashes", async () => {
    await expect(verifyPassword("password", "bad-hash")).resolves.toBe(false);
  });
});
