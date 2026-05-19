import { Command } from "commander";
import { z } from "zod";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { assertReadOnlySql } from "../services/sql-safety.js";
import { cleanupInputFile } from "../utils/input-file-cleanup.js";
import { readStdin } from "../utils/stdin.js";
import { resolveTextInput } from "../utils/text-input.js";
import {
  blockBatch,
  type BlockBatchOperation
} from "../workflows/block-batch.js";
import { docUpsert } from "../workflows/doc-upsert.js";
import { sqlReport } from "../workflows/sql-report.js";

const blockBatchSchema = z.array(
  z.object({
    op: z.enum(["append", "update"]),
    payload: z.any()
  })
);

export interface WorkflowApi {
  resolvePath: (path: string) => Promise<{ id: string } | null>;
  createDoc: (input: {
    notebook: string;
    path: string;
    markdown?: string;
  }) => Promise<{ id: string }>;
  appendBlock: (input: {
    parentID: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  updateBlock: (input: {
    id: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
  query: (stmt: string) => Promise<unknown[]>;
}

export interface WorkflowCommandDeps {
  workflowApi: WorkflowApi;
  write: (value: string) => boolean;
}

export function registerWorkflowCommands(
  program: Command,
  deps: WorkflowCommandDeps
): void {
  const workflow = program.command("workflow");

  workflow
    .command("doc-upsert")
    .requiredOption("--notebook <id>")
    .requiredOption("--path <path>")
    .option("--append-file <path>")
    .option("--cleanup-input-file")
    .option("--json")
    .action(
      async (options: {
        notebook: string;
        path: string;
        appendFile?: string;
        cleanupInputFile?: boolean;
        json?: boolean;
      }) => {
        const append = await resolveTextInput({
          file: options.appendFile,
          fileName: "--append-file",
          required: false
        });

        await executeCommand({
          command: "workflow.doc-upsert",
          json: options.json,
          action: async () => {
            const result = await docUpsert(deps.workflowApi, {
              notebook: options.notebook,
              path: options.path,
              append
            });

            if (options.cleanupInputFile && options.appendFile) {
              cleanupInputFile(options.appendFile);
            }

            return result;
          },
          write: deps.write
        });
      }
    );

  workflow
    .command("block-batch")
    .option("--operations <json>")
    .option("--json")
    .action(async (options: { operations?: string; json?: boolean }) => {
      await executeCommand({
        command: "workflow.block-batch",
        json: options.json,
        action: async () => {
          const operations = await parseOperations(options.operations);
          return blockBatch(
            {
              appendBlock: (payload) =>
                deps.workflowApi.appendBlock(
                  payload as {
                    parentID: string;
                    data: string;
                    dataType: "markdown" | "dom";
                  }
                ),
              updateBlock: (payload) =>
                deps.workflowApi.updateBlock(
                  payload as {
                    id: string;
                    data: string;
                    dataType: "markdown" | "dom";
                  }
                )
            },
            operations
          );
        },
        write: deps.write
      });
    });

  workflow
    .command("sql-report")
    .requiredOption("--stmt <sql>")
    .option("--json")
    .action(async (options: { stmt: string; json?: boolean }) => {
      await executeCommand({
        command: "workflow.sql-report",
        json: options.json,
        action: async () =>
          sqlReport(deps.workflowApi, assertReadOnlySql(options.stmt)),
        write: deps.write
      });
    });
}

async function parseOperations(raw?: string): Promise<BlockBatchOperation[]> {
  const source = raw ?? (await readStdin()).trim();
  if (!source) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "block-batch requires --operations JSON or stdin input"
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "--operations must be a JSON array"
    );
  }

  const result = blockBatchSchema.safeParse(parsed);
  if (!result.success) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      "--operations must be a JSON array",
      {
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map(String),
          message: issue.message
        }))
      }
    );
  }

  return result.data as BlockBatchOperation[];
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
