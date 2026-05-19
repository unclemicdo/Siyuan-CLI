import { readFileSync } from "node:fs";
import { SiyuanCliError } from "../core/errors.js";
import { readStdin } from "./stdin.js";

/** Simple inline-only resolver for short non-content options like --keyword. */
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

/**
 * Resolve text input with priority: file > stdin.
 * Use this for write commands that should accept heredoc/piped input.
 */
export async function resolveTextInput(options: {
  file?: string;
  fileName: string;
  required: true;
}): Promise<string>;
export async function resolveTextInput(options: {
  file?: string;
  fileName: string;
  required: false;
}): Promise<string | undefined>;
export async function resolveTextInput(options: {
  file?: string;
  fileName: string;
  required: boolean;
}): Promise<string | undefined> {
  if (options.file !== undefined) return readTextFile(options.file);

  const stdinData = await readStdin();
  if (stdinData) return stdinData;

  if (options.required) {
    throw new SiyuanCliError(
      "VALIDATION_MISSING_INPUT",
      `Missing required input: provide ${options.fileName} or stdin`
    );
  }

  return undefined;
}

export function readTextFile(path: string): string {
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
