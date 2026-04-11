import { Command } from "commander";
import { z } from "zod";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { resolveOptionalTextInput } from "../utils/text-input.js";

const graphConfSchema = z.record(z.string(), z.unknown());

export interface GraphApi {
  global: (input: {
    k: string;
    conf: Record<string, unknown>;
    reqId: string;
  }) => Promise<unknown>;
  local: (input: {
    id: string;
    k: string;
    conf: Record<string, unknown>;
    reqId: string;
  }) => Promise<unknown>;
  resetGlobal: () => Promise<unknown>;
  resetLocal: () => Promise<unknown>;
}

export interface GraphCommandDeps {
  graphApi: GraphApi;
  write: (value: string) => boolean;
}

export function registerGraphCommands(program: Command, deps: GraphCommandDeps): void {
  const graph = program.command("graph");

  graph
    .command("global")
    .option("--query <text>", "", "")
    .option("--conf <json>")
    .option("--conf-file <path>")
    .option("--req-id <id>", "request id", "sy-cli")
    .option("--json")
    .action(
      async (options: {
        query: string;
        conf?: string;
        confFile?: string;
        reqId: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "graph.global",
          json: options.json,
          action: () =>
            deps.graphApi.global({
              k: options.query,
              conf: parseGraphConf({
                inline: options.conf,
                file: options.confFile
              }),
              reqId: options.reqId
            }),
          write: deps.write
        });
      }
    );

  graph
    .command("local")
    .requiredOption("--id <id>")
    .option("--query <text>", "", "")
    .option("--conf <json>")
    .option("--conf-file <path>")
    .option("--req-id <id>", "request id", "sy-cli")
    .option("--json")
    .action(
      async (options: {
        id: string;
        query: string;
        conf?: string;
        confFile?: string;
        reqId: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "graph.local",
          json: options.json,
          action: () =>
            deps.graphApi.local({
              id: options.id,
              k: options.query,
              conf: parseGraphConf({
                inline: options.conf,
                file: options.confFile
              }),
              reqId: options.reqId
            }),
          write: deps.write
        });
      }
    );

  graph
    .command("reset")
    .requiredOption("--scope <scope>", "global or local")
    .option("--json")
    .action(
      async (options: { scope: string; json?: boolean }) => {
        await executeCommand({
          command: "graph.reset",
          json: options.json,
          action: async () => {
            if (options.scope === "global") {
              return deps.graphApi.resetGlobal();
            }

            if (options.scope === "local") {
              return deps.graphApi.resetLocal();
            }

            throw new SiyuanCliError(
              "VALIDATION_INVALID_OPTION",
              "--scope must be either global or local"
            );
          },
          write: deps.write
        });
      }
    );
}

function parseGraphConf(input: {
  inline?: string;
  file?: string;
}): Record<string, unknown> {
  const raw = resolveOptionalTextInput({
    inline: input.inline,
    file: input.file,
    inlineName: "--conf",
    fileName: "--conf-file"
  });

  if (raw === undefined) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "Graph config must be a JSON object"
    );
  }

  const result = graphConfSchema.safeParse(parsed);
  if (!result.success) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "Graph config must be a JSON object",
      {
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map(String),
          message: issue.message
        }))
      }
    );
  }

  return result.data;
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
