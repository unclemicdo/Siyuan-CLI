import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface RefApi {
  refresh: (id: string) => Promise<unknown>;
  backlinks: (input: {
    id: string;
    k: string;
    mk: string;
    beforeLen: number;
    containChildren?: boolean;
  }) => Promise<unknown>;
  docBacklinks: (input: {
    defID: string;
    refTreeID: string;
    keyword: string;
    containChildren?: boolean;
    highlight?: boolean;
  }) => Promise<unknown>;
  docBackmentions: (input: {
    defID: string;
    refTreeID: string;
    keyword: string;
    containChildren?: boolean;
    highlight?: boolean;
  }) => Promise<unknown>;
  transfer: (input: {
    fromID: string;
    toID: string;
    refIDs?: string[];
  }) => Promise<unknown>;
}

export interface RefCommandDeps {
  refApi: RefApi;
  write: (value: string) => boolean;
}

export function registerRefCommands(program: Command, deps: RefCommandDeps): void {
  const ref = program.command("ref");

  ref
    .command("refresh")
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: "ref.refresh",
        json: options.json,
        action: () => deps.refApi.refresh(options.id),
        write: deps.write
      });
    });

  ref
    .command("backlinks")
    .requiredOption("--id <id>")
    .option("--keyword <text>", "", "")
    .option("--mention-keyword <text>", "", "")
    .option("--before-len <count>", "context length", "12")
    .option("--contain-children")
    .option("--json")
    .action(
      async (options: {
        id: string;
        keyword: string;
        mentionKeyword: string;
        beforeLen: string;
        containChildren?: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "ref.backlinks",
          json: options.json,
          action: () =>
            deps.refApi.backlinks({
              id: options.id,
              k: options.keyword,
              mk: options.mentionKeyword,
              beforeLen: parseRequiredNumber(options.beforeLen, "--before-len"),
              ...(options.containChildren ? { containChildren: true } : {})
            }),
          write: deps.write
        });
      }
    );

  ref
    .command("doc-backlinks")
    .requiredOption("--def-id <id>")
    .requiredOption("--ref-tree-id <id>")
    .option("--keyword <text>", "", "")
    .option("--contain-children")
    .option("--no-highlight")
    .option("--json")
    .action(
      async (options: {
        defId: string;
        refTreeId: string;
        keyword: string;
        containChildren?: boolean;
        highlight: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "ref.doc-backlinks",
          json: options.json,
          action: () =>
            deps.refApi.docBacklinks({
              defID: options.defId,
              refTreeID: options.refTreeId,
              keyword: options.keyword,
              ...(options.containChildren ? { containChildren: true } : {}),
              highlight: options.highlight
            }),
          write: deps.write
        });
      }
    );

  ref
    .command("doc-backmentions")
    .requiredOption("--def-id <id>")
    .requiredOption("--ref-tree-id <id>")
    .option("--keyword <text>", "", "")
    .option("--contain-children")
    .option("--no-highlight")
    .option("--json")
    .action(
      async (options: {
        defId: string;
        refTreeId: string;
        keyword: string;
        containChildren?: boolean;
        highlight: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "ref.doc-backmentions",
          json: options.json,
          action: () =>
            deps.refApi.docBackmentions({
              defID: options.defId,
              refTreeID: options.refTreeId,
              keyword: options.keyword,
              ...(options.containChildren ? { containChildren: true } : {}),
              highlight: options.highlight
            }),
          write: deps.write
        });
      }
    );

  ref
    .command("transfer")
    .requiredOption("--from-id <id>")
    .requiredOption("--to-id <id>")
    .option("--ref-id <id...>")
    .option("--json")
    .action(
      async (options: {
        fromId: string;
        toId: string;
        refId?: string[];
        json?: boolean;
      }) => {
        await executeCommand({
          command: "ref.transfer",
          json: options.json,
          action: () =>
            deps.refApi.transfer({
              fromID: options.fromId,
              toID: options.toId,
              ...(options.refId?.length ? { refIDs: options.refId } : {})
            }),
          write: deps.write
        });
      }
    );
}

function parseRequiredNumber(raw: string, optionName: string): number {
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
