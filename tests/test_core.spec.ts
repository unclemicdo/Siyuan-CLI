import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("bootstrap", () => {
  it("exposes a CLI factory function", async () => {
    const mod = await import("../src/cli.js");
    expect(typeof mod.createCli).toBe("function");
  });

  it("declares package bin and files whitelist for dist output", () => {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      bin?: Record<string, string>;
      files?: string[];
      engines?: { node?: string };
    };

    expect(packageJson.bin?.sy).toBe("dist/index.js");
    expect(packageJson.files).toEqual(["dist"]);
    expect(packageJson.engines?.node).toBe(">=22.10.0");
  });

  it("configures TypeScript emit from src only", () => {
    const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8")) as {
      compilerOptions?: { rootDir?: string; outDir?: string };
      include?: string[];
    };

    expect(tsconfig.compilerOptions?.rootDir).toBe("src");
    expect(tsconfig.compilerOptions?.outDir).toBe("dist");
    expect(tsconfig.include).toEqual(["src/**/*.ts"]);
  });

  it("uses a node shebang in the CLI entrypoint", () => {
    const indexPath = resolve(process.cwd(), "src/index.ts");
    const source = readFileSync(indexPath, "utf8");

    expect(source.startsWith("#!/usr/bin/env node\n")).toBe(true);
  });
});
