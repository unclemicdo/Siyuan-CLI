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

  it("documents exported env vars instead of inline token command examples", () => {
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const chineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-CN.md"),
      "utf8"
    );

    expect(englishReadme).not.toMatch(/SIYUAN_TOKEN=your-token\s+npm run dev --/);
    expect(chineseReadme).not.toMatch(/SIYUAN_TOKEN=your-token\s+npm run dev --/);
    expect(englishReadme).not.toMatch(/\|\s*SIYUAN_TOKEN=your-token\s+npm run dev --/);
    expect(chineseReadme).not.toMatch(/\|\s*SIYUAN_TOKEN=your-token\s+npm run dev --/);
    expect(englishReadme).toContain("export SIYUAN_TOKEN=your-token");
    expect(chineseReadme).toContain("export SIYUAN_TOKEN=your-token");
  });

  it("keeps the simplified installation model aligned between english and simplified chinese readmes", () => {
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const chineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-CN.md"),
      "utf8"
    );

    expect(englishReadme).toContain("### Project-level install");
    expect(englishReadme).toContain("### Global install");
    expect(chineseReadme).toContain("### 项目级安装");
    expect(chineseReadme).toContain("### 全局安装");
    expect(chineseReadme).not.toContain("### 1. 安装 Node.js");
  });

  it("keeps the added capability overview aligned between english and simplified chinese readmes", () => {
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const chineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-CN.md"),
      "utf8"
    );

    expect(englishReadme).toContain("Recent capability additions worth noting:");
    expect(englishReadme).toContain("AV / database workflows");
    expect(chineseReadme).toContain("最近新增的能力也值得一提：");
    expect(chineseReadme).toContain("AV / 数据库工作流");
  });

  it("keeps multilingual README navigation consistent", () => {
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const simplifiedChineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-CN.md"),
      "utf8"
    );
    const traditionalChineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-TW.md"),
      "utf8"
    );
    const spanishReadme = readFileSync(resolve(process.cwd(), "README.es.md"), "utf8");
    const koreanReadme = readFileSync(resolve(process.cwd(), "README.ko.md"), "utf8");

    expect(englishReadme).toContain(
      "[简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)"
    );

    const localizedNavigation =
      "[English](./README.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)";

    expect(simplifiedChineseReadme).toContain(localizedNavigation);
    expect(traditionalChineseReadme).toContain(localizedNavigation);
    expect(spanishReadme).toContain(localizedNavigation);
    expect(koreanReadme).toContain(localizedNavigation);
  });

  it("documents the built-in siyuan-cli skill in every README", () => {
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const simplifiedChineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-CN.md"),
      "utf8"
    );
    const traditionalChineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-TW.md"),
      "utf8"
    );
    const spanishReadme = readFileSync(resolve(process.cwd(), "README.es.md"), "utf8");
    const koreanReadme = readFileSync(resolve(process.cwd(), "README.ko.md"), "utf8");

    for (const readme of [
      englishReadme,
      simplifiedChineseReadme,
      traditionalChineseReadme,
      spanishReadme,
      koreanReadme
    ]) {
      expect(readme).toContain("skills/siyuan-cli/");
      expect(readme).toContain("npm run skill:install");
      expect(readme).toContain("~/.codex/skills");
      expect(readme).toContain("~/.claude/skills");
      expect(readme).toContain("siyuan-cli");
    }
  });

  it("ships a root MIT license and mentions acknowledgements in every README", () => {
    const license = readFileSync(resolve(process.cwd(), "LICENSE"), "utf8");
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const simplifiedChineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-CN.md"),
      "utf8"
    );
    const traditionalChineseReadme = readFileSync(
      resolve(process.cwd(), "README.zh-TW.md"),
      "utf8"
    );
    const spanishReadme = readFileSync(resolve(process.cwd(), "README.es.md"), "utf8");
    const koreanReadme = readFileSync(resolve(process.cwd(), "README.ko.md"), "utf8");

    expect(license).toContain("MIT License");

    for (const readme of [
      englishReadme,
      simplifiedChineseReadme,
      traditionalChineseReadme,
      spanishReadme,
      koreanReadme
    ]) {
      expect(readme).toContain("https://github.com/siyuan-note/siyuan");
      expect(readme).toContain("https://github.com/siyuan-note/siyuan/blob/master/API.md");
      expect(readme).toContain("[LICENSE](./LICENSE)");
    }
  });

  it("ships a shared siyuan-cli skill with its bundled references", () => {
    const sharedSkill = resolve(process.cwd(), "skills/siyuan-cli/SKILL.md");
    const evals = resolve(process.cwd(), "skills/siyuan-cli/evals/evals.json");
    const commandSelection = resolve(
      process.cwd(),
      "skills/siyuan-cli/references/command-selection.md"
    );
    const recipes = resolve(process.cwd(), "skills/siyuan-cli/references/recipes.md");
    const errorHandling = resolve(
      process.cwd(),
      "skills/siyuan-cli/references/error-handling.md"
    );
    const openaiYaml = resolve(
      process.cwd(),
      "skills/siyuan-cli/agents/openai.yaml"
    );

    expect(() => readFileSync(sharedSkill, "utf8")).not.toThrow();
    expect(() => readFileSync(evals, "utf8")).not.toThrow();
    expect(() => readFileSync(commandSelection, "utf8")).not.toThrow();
    expect(() => readFileSync(recipes, "utf8")).not.toThrow();
    expect(() => readFileSync(errorHandling, "utf8")).not.toThrow();
    expect(() => readFileSync(openaiYaml, "utf8")).not.toThrow();
  });

  it("ships a skill install script", () => {
    const installScript = resolve(process.cwd(), "scripts/install-skill.mjs");
    expect(() => readFileSync(installScript, "utf8")).not.toThrow();
  });

  it("keeps the shared siyuan-cli skill self-contained", () => {
    const sharedSkill = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/SKILL.md"),
      "utf8"
    );

    expect(sharedSkill).toContain("name: siyuan-cli");
    expect(sharedSkill).toContain("references/command-selection.md");
    expect(sharedSkill).toContain("references/recipes.md");
    expect(sharedSkill).toContain("references/error-handling.md");
  });

  it("documents simplified siyuan-cli execution defaults and tag routing clearly", () => {
    const englishReadme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const sharedSkill = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/SKILL.md"),
      "utf8"
    );
    const commandSelection = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/references/command-selection.md"),
      "utf8"
    );
    const recipes = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/references/recipes.md"),
      "utf8"
    );
    const knowledge = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/references/knowledge-management.md"),
      "utf8"
    );
    const errorHandling = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/references/error-handling.md"),
      "utf8"
    );
    const openaiYaml = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/agents/openai.yaml"),
      "utf8"
    );
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");

    expect(sharedSkill).toContain("If global `sy ...` is installed and available");
    expect(sharedSkill).toContain("If global `sy ...` is not available, fall back to `npm run dev -- ...`");
    expect(sharedSkill).toContain("Do not assume `npm run dev -- ...` is available from arbitrary directories");
    expect(sharedSkill).toContain(
      "Prefer `doc create --markdown-file` for multiline document creation and `block append --data-file`"
    );
    expect(sharedSkill).toContain("Do not assume other block mutations accept file-input flags");
    expect(sharedSkill).toContain("If the file was generated just for this run, add `--cleanup-input-file`");
    expect(sharedSkill).toContain("only on commands that support it");
    expect(commandSelection).toContain("Prefer global `sy ...` when it is installed");
    expect(commandSelection).toContain("If global `sy ...` is unavailable");
    expect(commandSelection).toContain("Repo-root Fallback Rule");
    expect(commandSelection).toContain("Prefer `doc create --markdown-file`");
    expect(commandSelection).toContain("Prefer `workflow doc-upsert` only when the write is create-or-append text");
    expect(recipes).toContain("If `doc resolve-path` returns `null`, do not continue to `block append`");
    expect(knowledge).toContain("writes the document root `tags` attribute");
    expect(knowledge).toContain("verify document tag writes");
    expect(errorHandling).toContain("## `VALIDATION_*`");
    expect(errorHandling).toContain("unknown option");
    expect(errorHandling).toContain("repo-local fallback from the wrong working directory");
    expect(openaiYaml).toContain("run `system version --json` as preflight");
    expect(openaiYaml).toContain("knowledge-management.md");
    expect(openaiYaml).toContain("repository-root fallback");
    expect(packageJson).toContain("\"skill:install\"");
    expect(englishReadme).toContain("single source of truth");
    expect(englishReadme).toContain("npm run skill:install -- --target-dir ~/.codex/skills --force");
    expect(englishReadme).toContain("~/.codex/skills");
  });

  it("ships minimal skill eval prompts for command routing, multiline writes, and failure recovery", () => {
    const evals = JSON.parse(
      readFileSync(resolve(process.cwd(), "skills/siyuan-cli/evals/evals.json"), "utf8")
    ) as {
      skill_name: string;
      evals: Array<{ id: number; prompt: string; expected_output: string; files: string[] }>;
    };

    expect(evals.skill_name).toBe("siyuan-cli");
    expect(evals.evals).toHaveLength(3);
    expect(evals.evals.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(evals.evals[0]?.prompt).toContain("/Projects/Alpha");
    expect(evals.evals[0]?.expected_output).toContain("doc resolve-path");
    expect(evals.evals[1]?.expected_output).toContain("doc create --markdown-file");
    expect(evals.evals[1]?.expected_output).toContain("block append --data-file");
    expect(evals.evals[1]?.expected_output).toContain("not invent `--data-file`");
    expect(evals.evals[2]?.prompt).toContain("template render-sprig");
    expect(evals.evals[2]?.expected_output).toContain("rejects `--var` and `--vars`");
    expect(evals.evals.every((item) => Array.isArray(item.files) && item.files.length === 0)).toBe(
      true
    );
  });
});
