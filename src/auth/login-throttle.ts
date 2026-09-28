import "server-only";

import { createHmac } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/client";
import { logWarn } from "@/lib/log";
import {
  blockDurationSeconds,
  THROTTLE_WINDOW_SECONDS,
  type ThrottleScope,
} from "./throttle-policy";

type BlockRow = {
  blocked_until: Date | null;
};

type FailureRow = {
  failure_count: number;
};

type FailureKey = {
  hash: string;
  scope: ThrottleScope;
};

function throttleSecret() {
  const secret = process.env.AUTH_THROTTLE_SECRET;

  if (!secret) {
    throw new Error("AUTH_THROTTLE_SECRET is not configured");
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "AUTH_THROTTLE_SECRET must contain at least 32 characters in production",
    );
  }

  return secret;
}

function hashThrottleKey(scope: ThrottleScope, value: string) {
  return createHmac("sha256", throttleSecret())
    .update(`${scope}:${value}`)
    .digest("hex");
}

function firstForwardedAddress(value: string | null) {
  const address = value?.split(",", 1)[0]?.trim();
  return address && address.length <= 128 ? address : null;
}

/**
 * Vercel overwrites x-forwarded-for, making it suitable as a source key. A
 * self-hosted production deployment must explicitly opt in only when its
 * reverse proxy overwrites (rather than appends to) the same header.
 */
export function getLoginSource(requestHeaders: Headers) {
  if (process.env.VERCEL === "1") {
    return firstForwardedAddress(
      requestHeaders.get("x-vercel-forwarded-for") ??
        requestHeaders.get("x-forwarded-for"),
    );
  }

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_TRUST_PROXY_HEADERS === "true"
  ) {
    return (
      firstForwardedAddress(
        requestHeaders.get("x-forwarded-for") ??
          requestHeaders.get("x-real-ip"),
      ) ?? "local-development"
    );
  }

  return null;
}

function failureKeys(
  email: string,
  source: string | null,
  includeAccount: boolean,
) {
  const keys: FailureKey[] = [];

  if (source) {
    keys.push({ hash: hashThrottleKey("source", source), scope: "source" });
  }

  if (includeAccount) {
    keys.push({ hash: hashThrottleKey("account", email), scope: "account" });
    if (source) {
      keys.push({
        hash: hashThrottleKey("pair", `${email}:${source}`),
        scope: "pair",
      });
    }
  }

  return keys;
}

export async function isLoginBlocked(
  email: string,
  source: string | null,
  includeAccount: boolean,
) {
  const blockingKeys = failureKeys(email, source, includeAccount).filter(
    ({ scope }) => scope !== "account",
  );

  if (blockingKeys.length === 0) {
    return false;
  }

  const result = await query<BlockRow>(
    `SELECT blocked_until
       FROM login_throttle
      WHERE key_hash = ANY($1::text[])
        AND blocked_until > now()
      ORDER BY blocked_until DESC
      LIMIT 1`,
    [blockingKeys.map(({ hash }) => hash)],
  );

  return Boolean(result.rows[0]?.blocked_until);
}

async function incrementFailure(client: PoolClient, key: FailureKey) {
  const result = await client.query<FailureRow>(
    `INSERT INTO login_throttle (
       key_hash, scope, failure_count, window_started_at, blocked_until, updated_at
     )
     VALUES ($1, $2, 1, now(), NULL, now())
     ON CONFLICT (key_hash) DO UPDATE
       SET scope = EXCLUDED.scope,
           failure_count = CASE
             WHEN login_throttle.window_started_at <=
                  now() - make_interval(secs => $3::double precision)
               THEN 1
             ELSE login_throttle.failure_count + 1
           END,
           window_started_at = CASE
             WHEN login_throttle.window_started_at <=
                  now() - make_interval(secs => $3::double precision)
               THEN now()
             ELSE login_throttle.window_started_at
           END,
           blocked_until = CASE
             WHEN login_throttle.window_started_at <=
                  now() - make_interval(secs => $3::double precision)
               THEN NULL
             ELSE login_throttle.blocked_until
           END,
           updated_at = now()
     RETURNING failure_count`,
    [key.hash, key.scope, THROTTLE_WINDOW_SECONDS],
  );

  const failureCount = result.rows[0]?.failure_count ?? 1;
  const blockSeconds = blockDurationSeconds(key.scope, failureCount);

  if (blockSeconds > 0) {
    await client.query(
      `UPDATE login_throttle
          SET blocked_until = GREATEST(
                COALESCE(blocked_until, now()),
                now() + make_interval(secs => $2::double precision)
              ),
              updated_at = now()
        WHERE key_hash = $1`,
      [key.hash, blockSeconds],
    );
    logWarn("Login throttle activated", {
      scope: key.scope,
      key: key.hash.slice(0, 12),
      failureCount,
      blockSeconds,
    });
  }

  if (
    key.scope === "account" &&
    failureCount >= 10 &&
    failureCount % 10 === 0
  ) {
    logWarn("Repeated login failures for account", {
      accountKey: key.hash.slice(0, 12),
      failureCount,
      windowSeconds: THROTTLE_WINDOW_SECONDS,
    });
  }
}

export async function recordLoginFailure(
  email: string,
  source: string | null,
  includeAccount: boolean,
) {
  const keys = failureKeys(email, source, includeAccount);

  if (keys.length === 0) {
    return;
  }

  await withTransaction(async (client) => {
    await client.query(
      "DELETE FROM login_throttle WHERE updated_at < now() - interval '7 days'",
    );
    for (const key of keys) {
      await incrementFailure(client, key);
    }
  });
}

export async function clearAccountLoginFailures(
  email: string,
  source: string | null,
) {
  const keys = failureKeys(email, source, true).filter(
    ({ scope }) => scope !== "source",
  );

  await query("DELETE FROM login_throttle WHERE key_hash = ANY($1::text[])", [
    keys.map(({ hash }) => hash),
  ]);
}
