import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { cleanupInputFile } from "../utils/input-file-cleanup.js";
import { resolveOptionalTextInput } from "../utils/text-input.js";

export interface DocApi {
  create: (input: {
    notebook: string;
    path: string;
    markdown?: string;
  }) => Promise<unknown>;
  exportMarkdown: (id: string) => Promise<unknown>;
  rename: (id: string, title: string) => Promise<unknown>;
  move: (fromIDs: string[], toID: string) => Promise<unknown>;
  remove: (id: string, force?: boolean) => Promise<unknown>;
  resolvePath: (path: string) => Promise<unknown>;
}

export interface DocCommandDeps {
  docApi: DocApi;
  write: (value: string) => boolean;
}

export function registerDocCommands(program: Command, deps: DocCommandDeps): void {
  const doc = program.command("doc");

  doc
    .command("create")
    .requiredOption("--notebook <id>")
    .requiredOption("--path <path>")
    .option("--markdown <markdown>")
    .option("--markdown-file <path>")
    .option("--cleanup-input-file")
    .option("--json")
    .action(
      async (options: {
        notebook: string;
        path: string;
        markdown?: string;
        markdownFile?: string;
        cleanupInputFile?: boolean;
        json?: boolean;
      }) => {
        const markdown = resolveOptionalTextInput({
          inline: options.markdown,
          file: options.markdownFile,
          inlineName: "--markdown",
          fileName: "--markdown-file"
        });

        await executeCommand({
          command: "doc.create",
          json: options.json,
          action: async () => {
            const data = await deps.docApi.create({
              notebook: options.notebook,
              path: options.path,
              markdown
            });

            if (options.cleanupInputFile && options.markdownFile) {
              cleanupInputFile(options.markdownFile);
            }

            return data;
          },
          write: deps.write
        });
      }
    );

  doc
    .command("export-md")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "doc.export-md",
        json: options.json,
        action: () => deps.docApi.exportMarkdown(options.id),
        write: deps.write
      });
    });

  doc
    .command("rename")
    .requiredOption("--id <id>")
    .requiredOption("--title <title>")
    .option("--json")
    .action(async (options: { id: string; title: string; json?: boolean }) => {
      await executeCommand({
        command: "doc.rename",
        json: options.json,
        action: () => deps.docApi.rename(options.id, options.title),
        write: deps.write
      });
    });

  doc
    .command("move")
    .requiredOption("--from-id <id...>")
    .requiredOption("--to-id <id>")
    .option("--json")
    .action(
      async (options: {
        fromId: string | string[];
        toId: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "doc.move",
          json: options.json,
          action: () =>
            deps.docApi.move(toArray(options.fromId), options.toId),
          write: deps.write
        });
      }
    );

  doc
    .command("remove")
    .requiredOption("--id <id>")
    .option("--force")
    .option("--json")
    .action(async (options: { id: string; force?: boolean; json?: boolean }) => {
      await executeCommand({
        command: "doc.remove",
        json: options.json,
        action: () => deps.docApi.remove(options.id, options.force),
        write: deps.write
      });
    });

  doc
    .command("resolve-path")
    .requiredOption("--path <path>")
    .option("--json")
    .action(async (options: { path: string; json?: boolean }) => {
      await executeCommand({
        command: "doc.resolve-path",
        json: options.json,
        action: () => deps.docApi.resolvePath(options.path),
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
