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
      expect(readme).toContain(".codex/skills/siyuan-cli/");
      expect(readme).toContain(".claude/skills/siyuan-cli/");
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

  it("ships a shared siyuan-cli skill plus codex and claude compatibility entrypoints", () => {
    const sharedSkill = resolve(process.cwd(), "skills/siyuan-cli/SKILL.md");
    const codexSkill = resolve(process.cwd(), ".codex/skills/siyuan-cli/SKILL.md");
    const claudeSkill = resolve(process.cwd(), ".claude/skills/siyuan-cli/SKILL.md");
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
    expect(() => readFileSync(codexSkill, "utf8")).not.toThrow();
    expect(() => readFileSync(claudeSkill, "utf8")).not.toThrow();
    expect(() => readFileSync(commandSelection, "utf8")).not.toThrow();
    expect(() => readFileSync(recipes, "utf8")).not.toThrow();
    expect(() => readFileSync(errorHandling, "utf8")).not.toThrow();
    expect(() => readFileSync(openaiYaml, "utf8")).not.toThrow();
  });

  it("routes codex and claude entrypoints to the shared siyuan-cli skill", () => {
    const sharedSkill = readFileSync(
      resolve(process.cwd(), "skills/siyuan-cli/SKILL.md"),
      "utf8"
    );
    const codexSkill = readFileSync(
      resolve(process.cwd(), ".codex/skills/siyuan-cli/SKILL.md"),
      "utf8"
    );
    const claudeSkill = readFileSync(
      resolve(process.cwd(), ".claude/skills/siyuan-cli/SKILL.md"),
      "utf8"
    );

    expect(sharedSkill).toContain("name: siyuan-cli");
    expect(sharedSkill).toContain("references/command-selection.md");
    expect(sharedSkill).toContain("references/recipes.md");
    expect(sharedSkill).toContain("references/error-handling.md");

    expect(codexSkill).toContain("skills/siyuan-cli/SKILL.md");
    expect(claudeSkill).toContain("skills/siyuan-cli/SKILL.md");
    expect(codexSkill).toContain("references/command-selection.md");
    expect(claudeSkill).toContain("references/error-handling.md");
  });
});
