import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";
import { assertReadOnlySql } from "../services/sql-safety.js";

export interface SqlApi {
  query: (stmt: string) => Promise<unknown>;
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
      try {
        const stmt = assertReadOnlySql(options.stmt);
        const started = Date.now();
        const data = await deps.sqlApi.query(stmt);
        const payload = formatSuccess("sql.query", data, Date.now() - started);
        const output = options.json
          ? JSON.stringify(payload)
          : JSON.stringify(payload.data);
        deps.write(`${output}\n`);
      } catch (error) {
        if (options.json) {
          const cliError =
            error instanceof SiyuanCliError
              ? error
              : new SiyuanCliError(
                  "INTERNAL_ERROR",
                  error instanceof Error ? error.message : "Unexpected error"
                );
          const payload = formatFailure("sql.query", cliError);
          process.exitCode = 1;
          deps.write(`${JSON.stringify(payload)}\n`);
          return;
        }

        throw error;
      }
    });

  sql
    .command("explain-safety")
    .requiredOption("--stmt <sql>")
    .option("--json")
    .action(async (options: { stmt: string; json?: boolean }) => {
      try {
        const normalizedStmt = assertReadOnlySql(options.stmt);
        const payload = formatSuccess(
          "sql.explain-safety",
          {
            accepted: true,
            readOnly: true,
            normalizedStmt
          },
          0
        );
        const output = options.json
          ? JSON.stringify(payload)
          : JSON.stringify(payload.data);
        deps.write(`${output}\n`);
      } catch (error) {
        if (options.json) {
          const cliError =
            error instanceof SiyuanCliError
              ? error
              : new SiyuanCliError(
                  "INTERNAL_ERROR",
                  error instanceof Error ? error.message : "Unexpected error"
                );
          const payload = formatFailure("sql.explain-safety", cliError);
          process.exitCode = 1;
          deps.write(`${JSON.stringify(payload)}\n`);
          return;
        }

        throw error;
      }
    });
}
