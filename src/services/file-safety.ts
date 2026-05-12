import { SiyuanCliError } from "../core/errors.js";

const SAFE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export function assertSafeManagedFileName(name: string): string {
  if (
    !name ||
    !SAFE_NAME_PATTERN.test(name) ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    throw new SiyuanCliError(
      "FILE_UNSAFE_PATH",
      "Managed file names must be flat safe names without path traversal",
      { name }
    );
  }

  return name;
}
