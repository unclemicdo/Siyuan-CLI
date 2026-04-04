import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface NotebookApi {
  list: () => Promise<unknown>;
  create: (name: string) => Promise<unknown>;
  open: (notebook: string) => Promise<unknown>;
  close: (notebook: string) => Promise<unknown>;
}

export interface NotebookCommandDeps {
  notebookApi: NotebookApi;
  write: (value: string) => boolean;
}

export function registerNotebookCommands(
  program: Command,
  deps: NotebookCommandDeps
): void {
  const notebook = program.command("notebook");

  notebook
    .command("list")
    .option("--json")
    .action(async (options: { json?: boolean }) => {
      await executeCommand({
        command: "notebook.list",
        json: options.json,
        action: () => deps.notebookApi.list(),
        write: deps.write
      });
    });

  notebook
    .command("create")
    .requiredOption("--name <name>")
    .option("--json")
    .action(async (options: { name: string; json?: boolean }) => {
      await executeCommand({
        command: "notebook.create",
        json: options.json,
        action: () => deps.notebookApi.create(options.name),
        write: deps.write
      });
    });

  notebook
    .command("open")
    .requiredOption("--notebook <id>")
    .option("--json")
    .action(async (options: { notebook: string; json?: boolean }) => {
      await executeCommand({
        command: "notebook.open",
        json: options.json,
        action: () => deps.notebookApi.open(options.notebook),
        write: deps.write
      });
    });

  notebook
    .command("close")
    .requiredOption("--notebook <id>")
    .option("--json")
    .action(async (options: { notebook: string; json?: boolean }) => {
      await executeCommand({
        command: "notebook.close",
        json: options.json,
        action: () => deps.notebookApi.close(options.notebook),
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
