import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface PathApi {
  docId: (path: string) => Promise<unknown>;
  docHPath: (id: string) => Promise<unknown>;
  docPath: (id: string) => Promise<unknown>;
  docIds: (paths: string[]) => Promise<unknown>;
  blockDoc: (id: string) => Promise<unknown>;
  blockRoot: (id: string) => Promise<unknown>;
  blockHPath: (id: string) => Promise<unknown>;
}

export interface PathCommandDeps {
  pathApi: PathApi;
  write: (value: string) => boolean;
}

export function registerPathCommands(
  program: Command,
  deps: PathCommandDeps
): void {
  const path = program.command("path");

  path
    .command("doc-id")
    .requiredOption("--path <path>")
    .option("--json")
    .action(async (options: { path: string; json?: boolean }) => {
      await executeCommand({
        command: "path.doc-id",
        json: options.json,
        action: () => deps.pathApi.docId(options.path),
        write: deps.write
      });
    });

  path
    .command("doc-hpath")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "path.doc-hpath",
        json: options.json,
        action: () => deps.pathApi.docHPath(options.id),
        write: deps.write
      });
    });

  path
    .command("doc-path")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "path.doc-path",
        json: options.json,
        action: () => deps.pathApi.docPath(options.id),
        write: deps.write
      });
    });

  path
    .command("doc-ids")
    .requiredOption("--path <path...>")
    .option("--json")
    .action(async (options: { path: string | string[]; json?: boolean }) => {
      await executeCommand({
        command: "path.doc-ids",
        json: options.json,
        action: () => deps.pathApi.docIds(toArray(options.path)),
        write: deps.write
      });
    });

  path
    .command("block-doc")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "path.block-doc",
        json: options.json,
        action: () => deps.pathApi.blockDoc(options.id),
        write: deps.write
      });
    });

  path
    .command("block-root")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "path.block-root",
        json: options.json,
        action: () => deps.pathApi.blockRoot(options.id),
        write: deps.write
      });
    });

  path
    .command("block-hpath")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "path.block-hpath",
        json: options.json,
        action: () => deps.pathApi.blockHPath(options.id),
        write: deps.write
      });
    });
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
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
