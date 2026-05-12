import { Command } from "commander";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

export interface AssetApi {
  upload: (input: { filePath: string; uploadName?: string }) => Promise<unknown>;
}

export interface AssetCommandDeps {
  assetApi: AssetApi;
  write: (value: string) => boolean;
}

export function registerAssetCommands(
  program: Command,
  deps: AssetCommandDeps
): void {
  const asset = program.command("asset");

  asset
    .command("upload")
    .requiredOption("--file <path>")
    .option("--upload-name <name>")
    .option("--json")
    .action(
      async (options: {
        file: string;
        uploadName?: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "asset.upload",
          json: options.json,
          action: () =>
            deps.assetApi.upload({
              filePath: options.file,
              uploadName: options.uploadName
            }),
          write: deps.write
        });
      }
    );
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
