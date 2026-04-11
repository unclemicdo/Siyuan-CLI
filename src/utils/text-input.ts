import { readFileSync } from "node:fs";
import { SiyuanCliError } from "../core/errors.js";

export function resolveOptionalTextInput(input: {
  inline?: string;
  file?: string;
  inlineName: string;
  fileName: string;
}): string | undefined {
  if (input.inline !== undefined && input.file !== undefined) {
    throw new SiyuanCliError(
      "VALIDATION_CONFLICTING_OPTIONS",
      `Use either ${input.inlineName} or ${input.fileName}, not both`
    );
  }

  return input.file !== undefined ? readTextFile(input.file) : input.inline;
}

export function resolveRequiredTextInput(input: {
  inline?: string;
  file?: string;
  inlineName: string;
  fileName: string;
}): string {
  const value = resolveOptionalTextInput(input);
  if (value === undefined) {
    throw new SiyuanCliError(
      "VALIDATION_MISSING_INPUT",
      `Missing required input: provide ${input.inlineName} or ${input.fileName}`
    );
  }

  return value;
}

function readTextFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new SiyuanCliError(
      "VALIDATION_FILE_READ_FAILED",
      `Could not read input file: ${path}`,
      {
        path,
        message: error instanceof Error ? error.message : String(error)
      }
    );
  }
}
