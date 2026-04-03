import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface SystemApi {
  version: () => Promise<unknown>;
  bootProgress: () => Promise<unknown>;
  time: () => Promise<unknown>;
}

export interface SystemCommandDeps {
  systemApi: SystemApi;
  write: (value: string) => boolean;
}

export function registerSystemCommands(
  program: Command,
  deps: SystemCommandDeps
): void {
  const system = program.command("system");

  registerCommand(system, deps, "version", "version", "version");
  registerCommand(
    system,
    deps,
    "boot-progress",
    "bootProgress",
    "boot-progress"
  );
  registerCommand(system, deps, "time", "time", "time");
}

function registerCommand(
  parent: Command,
  deps: SystemCommandDeps,
  subcommand: "version" | "boot-progress" | "time",
  apiMethod: keyof SystemApi,
  commandName: "version" | "boot-progress" | "time"
): void {
  parent
    .command(subcommand)
    .option("--json")
    .action(async (options: { json?: boolean }) => {
      try {
        const started = Date.now();
        const data = await deps.systemApi[apiMethod]();
        const payload = formatSuccess(
          `system.${commandName}`,
          data,
          Date.now() - started
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
          const payload = formatFailure(`system.${commandName}`, cliError);
          process.exitCode = 1;
          deps.write(`${JSON.stringify(payload)}\n`);
          return;
        }

        throw error;
      }
    });
}
