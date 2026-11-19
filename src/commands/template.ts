import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { cleanupInputFile } from "../utils/input-file-cleanup.js";
import { resolveTextInput } from "../utils/text-input.js";

export type TemplateRenderMode = "preview" | "editorInsert";

export interface TemplateApi {
  render: (input: {
    id: string;
    path: string;
    preview?: boolean;
    mode?: TemplateRenderMode;
    httpConfirmToken?: string;
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
    .option("--mode <mode>", "preview or editorInsert")
    .option("--http-confirm-token <token>")
    .option("--json")
    .action(
      async (options: {
        id: string;
        path: string;
        preview?: boolean;
        mode?: string;
        httpConfirmToken?: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "template.render",
          json: options.json,
          action: () => {
            validateWorkspaceAbsolutePath(options.path, "--path");
            return deps.templateApi.render(
              buildRenderPayload({
                id: options.id,
                path: options.path,
                preview: options.preview,
                mode: options.mode,
                httpConfirmToken: options.httpConfirmToken
              })
            );
          },
          write: deps.write
        });
      }
    );

  template
    .command("render-sprig")
    .option("--template-file <path>")
    .option("--cleanup-input-file")
    .option("--var <key=value>", "template variable", collectValues, [])
    .option("--vars <json>")
    .option("--json")
    .action(
      async (options: {
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

            const templateSource = await resolveTextInput({
              file: options.templateFile,
              fileName: "--template-file",
              required: true
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

export function buildRenderPayload(input: {
  id: string;
  path: string;
  preview?: boolean;
  mode?: string;
  httpConfirmToken?: string;
}): {
  id: string;
  path: string;
  preview?: boolean;
  mode?: TemplateRenderMode;
  httpConfirmToken?: string;
} {
  const mode = parseOptionalMode(input.mode);
  if (input.preview && mode && mode !== "preview") {
    throw new SiyuanCliError(
      "VALIDATION_CONFLICTING_OPTIONS",
      "--preview conflicts with --mode when mode is not preview"
    );
  }

  const payload: {
    id: string;
    path: string;
    preview?: boolean;
    mode?: TemplateRenderMode;
    httpConfirmToken?: string;
  } = {
    id: input.id,
    path: input.path
  };

  if (mode) {
    payload.mode = mode;
  } else if (input.preview) {
    // Legacy boolean remains supported by SiYuan when mode is omitted.
    payload.preview = true;
  }

  if (input.httpConfirmToken !== undefined) {
    const token = input.httpConfirmToken.trim();
    if (!token) {
      throw new SiyuanCliError(
        "VALIDATION_INVALID_OPTION",
        "--http-confirm-token must be a non-empty token"
      );
    }
    payload.httpConfirmToken = token;
  }

  return payload;
}

function parseOptionalMode(raw: string | undefined): TemplateRenderMode | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (raw === "preview" || raw === "editorInsert") {
    return raw;
  }

  throw new SiyuanCliError(
    "VALIDATION_INVALID_OPTION",
    "--mode must be preview or editorInsert",
    { option: "--mode", received: raw, allowed: ["preview", "editorInsert"] }
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
