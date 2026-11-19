import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { assertSafeManagedFileName } from "./file-safety.js";

export type ManagedFileScope = "cache" | "export" | "report" | "tmp";
export type TempFileScope = "cache" | "staging" | "tmp";

const MANAGED_SCOPE_DIRECTORIES: Record<ManagedFileScope, string> = {
  cache: "cache",
  export: "exports",
  report: "reports",
  tmp: "tmp"
};

/**
 * Stable per-user root for managed agent artifacts.
 * Avoids CWD-relative `data/.sy-cli/...`, which polluted arbitrary working directories.
 */
export function getManagedRoot(): string {
  const xdgCacheHome = process.env.XDG_CACHE_HOME?.trim();
  if (xdgCacheHome) {
    return join(xdgCacheHome, "sy-cli");
  }

  return join(homedir(), ".cache", "sy-cli");
}

export function resolveManagedPath(scope: ManagedFileScope, name: string): string {
  const safeName = assertSafeManagedFileName(name);
  return join(getManagedRoot(), MANAGED_SCOPE_DIRECTORIES[scope], safeName);
}

export function resolveTempPath(scope: TempFileScope, name: string): string {
  const safeName = assertSafeManagedFileName(name);
  return join(tmpdir(), "sy-cli", scope, safeName);
}
