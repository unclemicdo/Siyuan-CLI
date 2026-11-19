import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { assertReadOnlySql } from "../services/sql-safety.js";

export interface SqlApi {
  query: (stmt: string) => Promise<unknown>;
  flush: () => Promise<unknown>;
}

export interface SqlCommandDeps {
  sqlApi: SqlApi;
  write: (value: string) => boolean;
}

export function registerSqlCommands(program: Command, deps: SqlCommandDeps): void {
  const sql = program.command("sql");

  sql
    .command("query")
    .requiredOption("--stmt <sql>")
    .option("--json")
    .action(async (options: { stmt: string; json?: boolean }) => {
      await executeCommand({
        command: "sql.query",
        json: options.json,
        action: async () => {
          const stmt = assertReadOnlySql(options.stmt);
          return deps.sqlApi.query(stmt);
        },
        write: deps.write
      });
    });

  sql
    .command("flush")
    .description(
      "Flush pending block-tree writes into the SQL index before subsequent sql query"
    )
    .option("--json")
    .action(async (options: { json?: boolean }) => {
      await executeCommand({
        command: "sql.flush",
        json: options.json,
        action: () => deps.sqlApi.flush(),
        write: deps.write
      });
    });

  sql
    .command("explain-safety")
    .requiredOption("--stmt <sql>")
    .option("--json")
    .action(async (options: { stmt: string; json?: boolean }) => {
      await executeCommand({
        command: "sql.explain-safety",
        json: options.json,
        action: async () => {
          const normalizedStmt = assertReadOnlySql(options.stmt);
          return {
            accepted: true,
            readOnly: true,
            normalizedStmt
          };
        },
        write: deps.write,
        durationMs: 0
      });
    });
}

async function executeCommand(input: {
  command: string;
  json?: boolean;
  action: () => Promise<unknown>;
  write: (value: string) => boolean;
  durationMs?: number;
}): Promise<void> {
  try {
    const started = Date.now();
    const data = await input.action();
    const duration =
      input.durationMs !== undefined ? input.durationMs : Date.now() - started;
    const payload = formatSuccess(input.command, data, duration);
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
