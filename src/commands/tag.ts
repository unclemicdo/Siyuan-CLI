import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface TagApi {
  list: (input: {
    sort?: number;
    app: string;
    ignoreMaxListHint: boolean;
  }) => Promise<unknown>;
  rename: (oldLabel: string, newLabel: string) => Promise<unknown>;
  remove: (label: string) => Promise<unknown>;
  setDocTags: (id: string, tags: string) => Promise<unknown>;
}

export interface TagCommandDeps {
  tagApi: TagApi;
  write: (value: string) => boolean;
}

export function registerTagCommands(program: Command, deps: TagCommandDeps): void {
  const tag = program.command("tag");

  tag
    .command("list")
    .option("--sort <mode>")
    .option("--app <id>", "client app id", "sy-cli")
    .option("--no-ignore-max-list-hint")
    .option("--json")
    .action(
      async (options: {
        sort?: string;
        app: string;
        ignoreMaxListHint: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "tag.list",
          json: options.json,
          action: () =>
            deps.tagApi.list({
              sort: parseOptionalNumber(options.sort, "--sort"),
              app: options.app,
              ignoreMaxListHint: options.ignoreMaxListHint
            }),
          write: deps.write
        });
      }
    );

  tag
    .command("rename")
    .requiredOption("--old-label <label>")
    .requiredOption("--new-label <label>")
    .option("--json")
    .action(
      async (options: {
        oldLabel: string;
        newLabel: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "tag.rename",
          json: options.json,
          action: () => deps.tagApi.rename(options.oldLabel, options.newLabel),
          write: deps.write
        });
      }
    );

  tag
    .command("remove")
    .requiredOption("--label <label>")
    .option("--json")
    .action(async (options: { label: string; json?: boolean }) => {
      await executeCommand({
        command: "tag.remove",
        json: options.json,
        action: () => deps.tagApi.remove(options.label),
        write: deps.write
      });
    });

  tag
    .command("set-doc")
    .requiredOption("--id <id>")
    .option("--tags <csv>")
    .option("--tag <value...>")
    .option("--clear")
    .option("--json")
    .action(
      async (options: {
        id: string;
        tags?: string;
        tag?: string[];
        clear?: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "tag.set-doc",
          json: options.json,
          action: () =>
            deps.tagApi.setDocTags(
              options.id,
              normalizeTags({
                tagsCsv: options.tags,
                tagsList: options.tag,
                clear: options.clear
              })
            ),
          write: deps.write
        });
      }
    );
}

function normalizeTags(input: {
  tagsCsv?: string;
  tagsList?: string[];
  clear?: boolean;
}): string {
  if (input.clear) {
    if (input.tagsCsv !== undefined || input.tagsList?.length) {
      throw new SiyuanCliError(
        "VALIDATION_CONFLICTING_OPTIONS",
        "Use either --clear or --tags/--tag, not both"
      );
    }

    return "";
  }

  const rawValues = [
    ...(input.tagsCsv ? input.tagsCsv.split(/[,\uFF0C]/) : []),
    ...(input.tagsList ?? [])
  ];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of rawValues) {
    const value = rawValue.trim().replace(/^[#,'"]+|[#,'"]+$/g, "");
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);
  }

  if (normalized.length === 0) {
    throw new SiyuanCliError(
      "VALIDATION_MISSING_INPUT",
      "Provide --tags, --tag, or --clear"
    );
  }

  return normalized.join(",");
}

function parseOptionalNumber(raw: string | undefined, optionName: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_NUMBER",
      `${optionName} must be a valid number`
    );
  }

  return value;
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
    const output = input.json ? JSON.stringify(payload) : JSON.stringify(payload.data);
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
