import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface ExportApi {
  resources: (input: { id: string; name?: string }) => Promise<unknown>;
}

export interface ExportCommandDeps {
  exportApi: ExportApi;
  write: (value: string) => boolean;
}

export function registerExportCommands(
  program: Command,
  deps: ExportCommandDeps
): void {
  const exportCommand = program.command("export");

  exportCommand
    .command("resources")
    .requiredOption("--id <id>")
    .option("--name <name>")
    .option("--json")
    .action(async (options: { id: string; name?: string; json?: boolean }) => {
      await executeCommand({
        command: "export.resources",
        json: options.json,
        action: () =>
          deps.exportApi.resources({
            id: options.id,
            name: options.name
          }),
        write: deps.write
      });
    });
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
