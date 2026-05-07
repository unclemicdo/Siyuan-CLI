import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { cleanupInputFile } from "../utils/input-file-cleanup.js";
import { resolveRequiredTextInput } from "../utils/text-input.js";

export interface BlockApi {
  get: (id: string) => Promise<unknown>;
  children: (id: string) => Promise<unknown>;
  append: (input: {
    parentID: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  prepend: (input: {
    parentID: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  insertBefore: (input: {
    nextID: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  insertAfter: (input: {
    previousID: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  update: (input: {
    id: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

export interface BlockCommandDeps {
  blockApi: BlockApi;
  write: (value: string) => boolean;
}

export function registerBlockCommands(
  program: Command,
  deps: BlockCommandDeps
): void {
  const block = program.command("block");

  block
    .command("get")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "block.get",
        json: options.json,
        action: () => deps.blockApi.get(options.id),
        write: deps.write
      });
    });

  block
    .command("append")
    .requiredOption("--parent-id <id>")
    .option("--data <value>")
    .option("--data-file <path>")
    .option("--cleanup-input-file")
    .option("--data-type <type>", "markdown or dom", "markdown")
    .option("--json")
    .action(
      async (options: {
        parentId: string;
        data?: string;
        dataFile?: string;
        cleanupInputFile?: boolean;
        dataType: "markdown" | "dom";
        json?: boolean;
      }) => {
        const data = resolveRequiredTextInput({
          inline: options.data,
          file: options.dataFile,
          inlineName: "--data",
          fileName: "--data-file"
        });

        await executeCommand({
          command: "block.append",
          json: options.json,
          action: async () => {
            const result = await deps.blockApi.append({
              parentID: options.parentId,
              data,
              dataType: options.dataType
            });

            if (options.cleanupInputFile && options.dataFile) {
              cleanupInputFile(options.dataFile);
            }

            return result;
          },
          write: deps.write
        });
      }
    );

  block
    .command("children")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "block.children",
        json: options.json,
        action: () => deps.blockApi.children(options.id),
        write: deps.write
      });
    });

  block
    .command("prepend")
    .requiredOption("--parent-id <id>")
    .requiredOption("--data <value>")
    .option("--data-type <type>", "markdown or dom", "markdown")
    .option("--json")
    .action(
      async (options: {
        parentId: string;
        data: string;
        dataType: "markdown" | "dom";
        json?: boolean;
      }) => {
        await executeCommand({
          command: "block.prepend",
          json: options.json,
          action: () =>
            deps.blockApi.prepend({
              parentID: options.parentId,
              data: options.data,
              dataType: options.dataType
            }),
          write: deps.write
        });
      }
    );

  block
    .command("insert-before")
    .requiredOption("--next-id <id>")
    .requiredOption("--data <value>")
    .option("--data-type <type>", "markdown or dom", "markdown")
    .option("--json")
    .action(
      async (options: {
        nextId: string;
        data: string;
        dataType: "markdown" | "dom";
        json?: boolean;
      }) => {
        await executeCommand({
          command: "block.insert-before",
          json: options.json,
          action: () =>
            deps.blockApi.insertBefore({
              nextID: options.nextId,
              data: options.data,
              dataType: options.dataType
            }),
          write: deps.write
        });
      }
    );

  block
    .command("insert-after")
    .requiredOption("--previous-id <id>")
    .requiredOption("--data <value>")
    .option("--data-type <type>", "markdown or dom", "markdown")
    .option("--json")
    .action(
      async (options: {
        previousId: string;
        data: string;
        dataType: "markdown" | "dom";
        json?: boolean;
      }) => {
        await executeCommand({
          command: "block.insert-after",
          json: options.json,
          action: () =>
            deps.blockApi.insertAfter({
              previousID: options.previousId,
              data: options.data,
              dataType: options.dataType
            }),
          write: deps.write
        });
      }
    );

  block
    .command("update")
    .requiredOption("--id <id>")
    .requiredOption("--data <value>")
    .option("--data-type <type>", "markdown or dom", "markdown")
    .option("--json")
    .action(
      async (options: {
        id: string;
        data: string;
        dataType: "markdown" | "dom";
        json?: boolean;
      }) => {
        await executeCommand({
          command: "block.update",
          json: options.json,
          action: () =>
            deps.blockApi.update({
              id: options.id,
              data: options.data,
              dataType: options.dataType
            }),
          write: deps.write
        });
      }
    );

  block
    .command("remove")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "block.remove",
        json: options.json,
        action: () => deps.blockApi.remove(options.id),
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
