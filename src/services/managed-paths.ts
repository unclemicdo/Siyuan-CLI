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

export function resolveManagedPath(scope: ManagedFileScope, name: string): string {
  const safeName = assertSafeManagedFileName(name);
  return join("data", ".sy-cli", MANAGED_SCOPE_DIRECTORIES[scope], safeName);
}

export function resolveTempPath(scope: TempFileScope, name: string): string {
  const safeName = assertSafeManagedFileName(name);
  return join("/tmp", "sy-cli", scope, safeName);
}
