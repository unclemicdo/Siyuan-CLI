import { dirname } from "node:path";
import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import {
  resolveManagedPath,
  resolveTempPath
} from "../services/managed-paths.js";
import { cleanupInputFile } from "../utils/input-file-cleanup.js";
import { resolveRequiredTextInput } from "../utils/text-input.js";

export type WritableFileScope = "cache" | "export" | "report";
export type ReadableFileScope = WritableFileScope;

export interface FileApi {
  put: (input: {
    path: string;
    content: string;
    overwrite?: boolean;
  }) => Promise<unknown>;
  get: (path: string) => Promise<unknown>;
  list: (path: string) => Promise<unknown>;
  remove: (input: { path: string; force: boolean }) => Promise<unknown>;
}

export interface FileCommandDeps {
  fileApi: FileApi;
  write: (value: string) => boolean;
}

export function registerFileCommands(
  program: Command,
  deps: FileCommandDeps
): void {
  const file = program.command("file");

  registerPutCommand(file, deps, "put-cache", "cache");
  registerPutCommand(file, deps, "put-export", "export");
  registerPutCommand(file, deps, "put-report", "report");

  file
    .command("get")
    .requiredOption("--scope <scope>")
    .requiredOption("--name <name>")
    .option("--json")
    .action(async (options: { scope: string; name: string; json?: boolean }) => {
      await executeCommand({
        command: "file.get",
        json: options.json,
        action: () => deps.fileApi.get(resolveManagedFilePath(options.scope, options.name)),
        write: deps.write
      });
    });

  file
    .command("list")
    .requiredOption("--scope <scope>")
    .option("--json")
    .action(async (options: { scope: string; json?: boolean }) => {
      await executeCommand({
        command: "file.list",
        json: options.json,
        action: () => deps.fileApi.list(resolveManagedDirectoryPath(options.scope)),
        write: deps.write
      });
    });

  file
    .command("remove")
    .requiredOption("--scope <scope>")
    .requiredOption("--name <name>")
    .option("--force")
    .option("--json")
    .action(
      async (options: {
        scope: string;
        name: string;
        force?: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "file.remove",
          json: options.json,
          action: () => {
            if (!options.force) {
              throw new SiyuanCliError(
                "VALIDATION_MISSING_OPTION",
                "Missing required option: --force",
                { option: "--force" }
              );
            }

            return deps.fileApi.remove({
              path: resolveManagedFilePath(options.scope, options.name),
              force: true
            });
          },
          write: deps.write
        });
      }
    );

  file
    .command("stage-put")
    .requiredOption("--name <name>")
    .option("--content <text>")
    .option("--content-file <path>")
    .option("--overwrite")
    .option("--cleanup-input-file")
    .option("--json")
    .action(
      async (options: {
        name: string;
        content?: string;
        contentFile?: string;
        overwrite?: boolean;
        cleanupInputFile?: boolean;
        json?: boolean;
      }) => {
        const content = resolveRequiredTextInput({
          inline: options.content,
          file: options.contentFile,
          inlineName: "--content",
          fileName: "--content-file"
        });

        await executeCommand({
          command: "file.stage-put",
          json: options.json,
          action: async () => {
            const result = await deps.fileApi.put({
              path: resolveTempPath("staging", options.name),
              content,
              overwrite: options.overwrite ?? false
            });

            if (options.cleanupInputFile && options.contentFile) {
              cleanupInputFile(options.contentFile);
            }

            return result;
          },
          write: deps.write
        });
      }
    );

  file
    .command("stage-get")
    .requiredOption("--name <name>")
    .option("--json")
    .action(async (options: { name: string; json?: boolean }) => {
      await executeCommand({
        command: "file.stage-get",
        json: options.json,
        action: () => deps.fileApi.get(resolveTempPath("staging", options.name)),
        write: deps.write
      });
    });
}

function registerPutCommand(
  file: Command,
  deps: FileCommandDeps,
  name: string,
  scope: WritableFileScope
): void {
  file
    .command(name)
    .requiredOption("--name <name>")
    .option("--content <text>")
    .option("--content-file <path>")
    .option("--overwrite")
    .option("--cleanup-input-file")
    .option("--json")
    .action(
      async (options: {
        name: string;
        content?: string;
        contentFile?: string;
        overwrite?: boolean;
        cleanupInputFile?: boolean;
        json?: boolean;
      }) => {
        const content = resolveRequiredTextInput({
          inline: options.content,
          file: options.contentFile,
          inlineName: "--content",
          fileName: "--content-file"
        });

        await executeCommand({
          command: `file.${name}`,
          json: options.json,
          action: async () => {
            const result = await deps.fileApi.put({
              path: resolveManagedPath(scope, options.name),
              content,
              overwrite: options.overwrite ?? false
            });

            if (options.cleanupInputFile && options.contentFile) {
              cleanupInputFile(options.contentFile);
            }

            return result;
          },
          write: deps.write
        });
      }
    );
}

function resolveManagedFilePath(scope: string, name: string): string {
  const managedScope = parseManagedScope(scope);
  return resolveManagedPath(managedScope, name);
}

function resolveManagedDirectoryPath(scope: string): string {
  const managedScope = parseManagedScope(scope);
  return dirname(resolveManagedPath(managedScope, "index"));
}

function parseManagedScope(scope: string): ReadableFileScope {
  if (scope === "cache" || scope === "export" || scope === "report") {
    return scope;
  }

  throw new SiyuanCliError(
    "VALIDATION_INVALID_OPTION",
    `Unsupported file scope: ${scope}`,
    {
      option: "--scope",
      allowed: ["cache", "export", "report"],
      received: scope
    }
  );
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
