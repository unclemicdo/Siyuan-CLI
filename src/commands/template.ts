import { readFileSync } from "node:fs";
import { Command } from "commander";
import { z } from "zod";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { cleanupInputFile } from "../utils/input-file-cleanup.js";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export interface TemplateApi {
  render: (input: {
    id: string;
    path: string;
    preview?: boolean;
  }) => Promise<unknown>;
  renderSprig: (input: {
    template: string;
    data?: Record<string, unknown>;
  }) => Promise<unknown>;
}

export interface TemplateCommandDeps {
  templateApi: TemplateApi;
  write: (value: string) => boolean;
}

export function registerTemplateCommands(
  program: Command,
  deps: TemplateCommandDeps
): void {
  const template = program.command("template");

  template
    .command("render")
    .requiredOption("--id <id>")
    .requiredOption("--path <path>")
    .option("--preview")
    .option("--json")
    .action(
      async (options: {
        id: string;
        path: string;
        preview?: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "template.render",
          json: options.json,
          action: () => {
            validateWorkspaceAbsolutePath(options.path, "--path");
            return deps.templateApi.render({
              id: options.id,
              path: options.path,
              preview: options.preview
            });
          },
          write: deps.write
        });
      }
    );

  template
    .command("render-sprig")
    .option("--template <template>")
    .option("--template-file <path>")
    .option("--cleanup-input-file")
    .option("--var <key=value>", "template variable", collectValues, [])
    .option("--vars <json>")
    .option("--json")
    .action(
      async (options: {
        template?: string;
        templateFile?: string;
        cleanupInputFile?: boolean;
        var: string[];
        vars?: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "template.render-sprig",
          json: options.json,
          action: async () => {
            if ((options.var?.length ?? 0) > 0 || options.vars !== undefined) {
              throw new SiyuanCliError(
                "VALIDATION_UNSUPPORTED_OPTION",
                "render-sprig does not support --var or --vars"
              );
            }

            const templateSource = resolveRequiredTextInput({
              inline: options.template,
              file: options.templateFile,
              inlineName: "--template",
              fileName: "--template-file"
            });
            const result = await deps.templateApi.renderSprig({
              template: templateSource
            });

            if (options.cleanupInputFile && options.templateFile) {
              cleanupInputFile(options.templateFile);
            }

            return result;
          },
          write: deps.write
        });
      }
    );
}

function validateWorkspaceAbsolutePath(path: string, optionName: string): void {
  if (path.startsWith("/")) {
    return;
  }

  throw new SiyuanCliError(
    "VALIDATION_INVALID_OPTION",
    `${optionName} must be an absolute workspace path`
  );
}

function collectValues(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function resolveRequiredTextInput(input: {
  inline?: string;
  file?: string;
  inlineName: string;
  fileName: string;
}): string {
  if (input.inline !== undefined && input.file !== undefined) {
    throw new SiyuanCliError(
      "VALIDATION_CONFLICTING_OPTIONS",
      `Use either ${input.inlineName} or ${input.fileName}, not both`
    );
  }

  const value = input.file !== undefined ? readTextFile(input.file) : input.inline;
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
