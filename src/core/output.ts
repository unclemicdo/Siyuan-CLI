import type { CommandFailure, CommandSuccess, JsonValue } from "./types.js";
import { SiyuanCliError } from "./errors.js";

export function formatSuccess<T>(
  command: string,
  data: T,
  durationMs: number
): CommandSuccess<T> {
  return {
    ok: true,
    command,
    data,
    meta: { duration_ms: durationMs }
  };
}

export function formatFailure(
  command: string,
  error: SiyuanCliError
): CommandFailure {
  const details = sanitizeJsonValue(error.details) ?? {};

  return {
    ok: false,
    command,
    error: {
      code: error.code,
      message: error.message,
      details
    }
  };
}

function sanitizeJsonValue(
  value: unknown,
  ancestors = new WeakSet<object>()
): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (ancestors.has(value)) {
    return "[Circular]";
  }

  ancestors.add(value);

  if (Array.isArray(value)) {
    const output = value.map((item) => sanitizeJsonValue(item, ancestors) ?? null);
    ancestors.delete(value);
    return output;
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(record)) {
    const safeValue = sanitizeJsonValue(entry, ancestors);
    if (safeValue !== undefined) {
      output[key] = safeValue;
    }
  }
  ancestors.delete(value);
  return output;
}
