#!/usr/bin/env node
import { createCli } from "./cli.js";
import { SiyuanCliError } from "./core/errors.js";

try {
  await createCli().parseAsync(process.argv);
} catch (error) {
  if (error instanceof SiyuanCliError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
  } else if (error instanceof Error) {
    process.stderr.write(`INTERNAL_ERROR: ${error.message}\n`);
  } else {
    process.stderr.write("INTERNAL_ERROR: Unexpected error\n");
  }
  process.exitCode = 1;
}
