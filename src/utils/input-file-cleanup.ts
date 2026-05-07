import { rmSync } from "node:fs";
import { SiyuanCliError } from "../core/errors.js";

export function cleanupInputFile(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch (error) {
    throw new SiyuanCliError(
      "VALIDATION_FILE_DELETE_FAILED",
      `Could not delete input file: ${path}`,
      {
        path,
        message: error instanceof Error ? error.message : String(error)
      }
    );
  }
}
