import { createCli } from "./cli.js";

await createCli().parseAsync(process.argv);
