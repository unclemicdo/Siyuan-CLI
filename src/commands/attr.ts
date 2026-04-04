import { Command } from "commander";
import { z } from "zod";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

const attrRecordSchema = z.record(z.string(), z.string());

export interface AttrApi {
  get: (id: string) => Promise<unknown>;
  set: (id: string, attrs: Record<string, string>) => Promise<unknown>;
}

export interface AttrCommandDeps {
  attrApi: AttrApi;
  write: (value: string) => boolean;
}

export function registerAttrCommands(
  program: Command,
  deps: AttrCommandDeps
): void {
  const attr = program.command("attr");

  attr
    .command("get")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "attr.get",
        json: options.json,
        action: () => deps.attrApi.get(options.id),
        write: deps.write
      });
    });

  attr
    .command("set")
    .requiredOption("--id <id>")
    .requiredOption("--attrs <json>")
    .option("--json")
    .action(async (options: { id: string; attrs: string; json?: boolean }) => {
      await executeCommand({
        command: "attr.set",
        json: options.json,
        action: () => deps.attrApi.set(options.id, parseAttrs(options.attrs)),
        write: deps.write
      });
    });
}

function parseAttrs(raw: string): Record<string, string> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "--attrs must be a JSON object with string values"
    );
  }

  const result = attrRecordSchema.safeParse(parsed);
  if (!result.success) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "--attrs must be a JSON object with string values",
      {
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map(String),
          message: issue.message
        }))
      }
    );
  }

  return result.data;
}

async function executeCommand(input: {
  command: string;
  json?: boolean;
  action: () => Promise<unknown>;
  write: (value: string) => boolean;
}): Promise<void> {
  try {
    const started = Date.now();
    const data = await input.action();
    const payload = formatSuccess(input.command, data, Date.now() - started);
    const output = input.json
      ? JSON.stringify(payload)
      : JSON.stringify(payload.data);
    input.write(`${output}\n`);
  } catch (error) {
    if (input.json) {
      const cliError =
        error instanceof SiyuanCliError
          ? error
          : new SiyuanCliError(
              "INTERNAL_ERROR",
              error instanceof Error ? error.message : "Unexpected error"
            );
      const payload = formatFailure(input.command, cliError);
      process.exitCode = 1;
      input.write(`${JSON.stringify(payload)}\n`);
      return;
    }

    throw error;
  }
}
