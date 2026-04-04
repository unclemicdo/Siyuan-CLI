import { SiyuanCliError } from "../core/errors.js";

const UNSAFE_PATTERNS = [
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bdrop\b/i,
  /\balter\b/i,
  /\bcreate\b/i,
  /\battach\b/i,
  /\bdetach\b/i,
  /\breindex\b/i,
  /\bvacuum\b/i,
  /\bpragma(?:\b|_)/i,
  /\breplace\b/i,
  /\bmerge\b/i,
  /\btruncate\b/i
];

export function assertReadOnlySql(stmt: string): string {
  const trimmed = stmt.trim();
  if (!trimmed) {
    throw new SiyuanCliError(
      "SQL_UNSAFE",
      "Only single read-only SELECT queries are allowed"
    );
  }

  const normalized = trimmed.endsWith(";")
    ? trimmed.slice(0, -1).trimEnd()
    : trimmed;

  if (!normalized || normalized.includes(";")) {
    throw new SiyuanCliError(
      "SQL_UNSAFE",
      "Only single read-only SELECT queries are allowed"
    );
  }

  if (!/^select\b/i.test(normalized)) {
    throw new SiyuanCliError(
      "SQL_UNSAFE",
      "Only SELECT read-only queries are allowed"
    );
  }

  const sanitized = stripCommentsAndStrings(normalized);
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new SiyuanCliError(
        "SQL_UNSAFE",
        "Only SELECT read-only queries are allowed"
      );
    }
  }

  return normalized;
}

function stripCommentsAndStrings(sql: string): string {
  let result = "";
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;
      result += " ";

      while (index < sql.length) {
        const current = sql[index];
        if (current === "\\" && index + 1 < sql.length) {
          index += 2;
          continue;
        }
        if (current === quote) {
          if (quote === "'" && sql[index + 1] === "'") {
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      while (index < sql.length && sql[index] !== "\n") {
        index += 1;
      }
      result += " ";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < sql.length) {
        if (sql[index] === "*" && sql[index + 1] === "/") {
          index += 2;
          break;
        }
        index += 1;
      }
      result += " ";
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}
