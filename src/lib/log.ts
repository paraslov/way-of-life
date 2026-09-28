/**
 * The only logger allowed in `src/` (biome forbids `console.*` elsewhere).
 * Logs go to Vercel, so they must never carry health data: every field is
 * dropped unless its key is on this allowlist of operational metadata
 * (architecture §10). Add a key only if its value can never be a measurement,
 * symptom, note or other personal content.
 */
const ALLOWED_FIELDS = new Set([
  "scope",
  "key",
  "accountKey",
  "failureCount",
  "blockSeconds",
  "windowSeconds",
  "code",
  "route",
  "table",
  "rows",
]);

type Field = string | number | boolean | null;

export function redact(fields: Record<string, unknown>): Record<string, Field> {
  const safe: Record<string, Field> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      (typeof value === "string" && value.length <= 64)
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

export function logWarn(event: string, fields: Record<string, unknown> = {}) {
  // biome-ignore lint/suspicious/noConsole: the single sanctioned sink.
  console.warn(event, redact(fields));
}

export function logError(event: string, fields: Record<string, unknown> = {}) {
  // biome-ignore lint/suspicious/noConsole: the single sanctioned sink.
  console.error(event, redact(fields));
}
