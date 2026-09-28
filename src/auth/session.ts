import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { query } from "@/lib/db/client";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

type SessionUserRow = {
  id: string;
  email: string;
};

export type CurrentUser = SessionUserRow;

function sessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-way_of_life_session"
    : "way_of_life_session";
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const result = await query<SessionUserRow>(
    `SELECT users.id, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > now()
        AND users.is_active = true
      LIMIT 1`,
    [hashSessionToken(token)],
  );

  return result.rows[0] ?? null;
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [
      hashSessionToken(token),
    ]);
  }

  cookieStore.delete(sessionCookieName());
}
