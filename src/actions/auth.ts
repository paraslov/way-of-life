"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearAccountLoginFailures,
  getLoginSource,
  isLoginBlocked,
  recordLoginFailure,
} from "@/auth/login-throttle";
import { verifyPassword } from "@/auth/password";
import { createSession, deleteCurrentSession } from "@/auth/session";
import { query } from "@/lib/db/client";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1_024),
});

type AccountRow = {
  id: string;
  password_hash: string;
  is_active: boolean;
};

export type LoginState = {
  error?: "invalidInput" | "invalidCredentials";
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalidInput" };
  }

  const email = parsed.data.email;
  const source = getLoginSource(await headers());
  const result = await query<AccountRow>(
    `SELECT id, password_hash, is_active
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email],
  );
  const account = result.rows[0];
  const activeAccountExists = Boolean(account?.is_active);

  if (await isLoginBlocked(email, source, activeAccountExists)) {
    return { error: "invalidCredentials" };
  }

  // Run the same expensive operation even when the account does not exist.
  const passwordMatches = account
    ? await verifyPassword(parsed.data.password, account.password_hash)
    : await verifyPassword(
        parsed.data.password,
        "scrypt$16384$8$1$N2M3SjR1NVVWckk2SW83cA$VoGYndiiLuN4CBT5Jbb8xqITCezfjSvaQjt28S2H_StdiHdjGEgrLEiuPps-aRVuXR_MNCF4rED2fjtTHtJVCg",
      );

  if (!account || !account.is_active || !passwordMatches) {
    await recordLoginFailure(email, source, activeAccountExists);
    return { error: "invalidCredentials" };
  }

  await query(
    `UPDATE users
        SET last_login_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [account.id],
  );
  await clearAccountLoginFailures(email, source);
  await createSession(account.id);
  redirect("/");
}

export async function logout() {
  await deleteCurrentSession();
  redirect("/login");
}
