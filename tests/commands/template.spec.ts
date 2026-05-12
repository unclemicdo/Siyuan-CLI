import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCli } from "../../src/cli.js";
import type { TemplateApi } from "../../src/commands/template.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function createTemplateCli(
  templateApi: TemplateApi,
  write = vi.fn(() => true)
) {
  const cli = createCli({
    templateApi,
    write
  });
  cli.exitOverride();
  return { cli, write };
}

describe("template commands", () => {
  it("renders official workspace templates with required doc id and absolute path", async () => {
    const write = vi.fn(() => true);
    const render = vi.fn(async (input) => ({ rendered: input }));
    const renderSprig = vi.fn(async () => ({}));
    const { cli } = createTemplateCli({ render, renderSprig }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "template",
      "render",
      "--id",
      "doc-1",
      "--path",
      "/data/templates/daily.md",
      "--preview",
      "--json"
    ]);

    expect(render).toHaveBeenCalledWith({
      id: "doc-1",
      path: "/data/templates/daily.md",
      preview: true
    });
    expect(renderSprig).not.toHaveBeenCalled();

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "template.render",
        data: {
          rendered: {
            id: "doc-1",
            path: "/data/templates/daily.md",
            preview: true
          }
        }
      })
    );
  });

  it("renders sprig templates from files and cleans up input files when requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-template-"));
    const templatePath = join(tempDir, "daily.tmpl");
    writeFileSync(templatePath, "Hello {{ .name }}", "utf8");

    const write = vi.fn(() => true);
    const render = vi.fn(async () => ({}));
    const renderSprig = vi.fn(async (input) => ({ rendered: input.template }));
    const { cli } = createTemplateCli({ render, renderSprig }, write);

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "template",
        "render-sprig",
        "--template-file",
        templatePath,
        "--cleanup-input-file",
        "--json"
      ]);

      expect(renderSprig).toHaveBeenCalledWith({
        template: "Hello {{ .name }}"
      });
      expect(existsSync(templatePath)).toBe(false);
      const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
      expect(payload).toEqual(
        expect.objectContaining({
          ok: true,
          command: "template.render-sprig",
          data: { rendered: "Hello {{ .name }}" }
        })
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects --var for render-sprig because the official endpoint only accepts template input", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const render = vi.fn(async () => ({}));
    const renderSprig = vi.fn(async () => ({}));
    const { cli } = createTemplateCli({ render, renderSprig }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "template",
      "render-sprig",
      "--template",
      "{{ .title }}",
      "--var",
      "title=Daily",
      "--json"
    ]);

    expect(renderSprig).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("template.render-sprig");
    expect(payload.error.code).toBe("VALIDATION_UNSUPPORTED_OPTION");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("returns structured json validation errors for non-workspace template paths", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const render = vi.fn(async () => ({}));
    const renderSprig = vi.fn(async () => ({}));
    const { cli } = createTemplateCli({ render, renderSprig }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "template",
      "render",
      "--id",
      "doc-1",
      "--path",
      "daily.md",
      "--json"
    ]);

    expect(render).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("template.render");
    expect(payload.error.code).toBe("VALIDATION_INVALID_OPTION");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("does not register --var or --vars on render because the official endpoint does not accept CLI-side variable injection", () => {
    const write = vi.fn(() => true);
    const render = vi.fn(async () => ({}));
    const renderSprig = vi.fn(async () => ({}));
    const { cli } = createTemplateCli({ render, renderSprig }, write);
    const template = cli.commands.find((command) => command.name() === "template");
    const renderCommand = template?.commands.find(
      (command) => command.name() === "render"
    );

    expect(renderCommand?.options.some((option) => option.long === "--var")).toBe(false);
    expect(renderCommand?.options.some((option) => option.long === "--vars")).toBe(false);
  });

  it("returns structured json validation errors for malformed --var entries", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const render = vi.fn(async () => ({}));
    const renderSprig = vi.fn(async () => ({}));
    const { cli } = createTemplateCli({ render, renderSprig }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "template",
      "render-sprig",
      "--template",
      "{{ .title }}",
      "--var",
      "title",
      "--json"
    ]);

    expect(renderSprig).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("template.render-sprig");
    expect(payload.error.code).toBe("VALIDATION_UNSUPPORTED_OPTION");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("registers template commands with json support", () => {
    const render = vi.fn(async () => ({}));
    const renderSprig = vi.fn(async () => ({}));
    const { cli } = createTemplateCli({ render, renderSprig });
    const template = cli.commands.find((command) => command.name() === "template");
    const renderCommand = template?.commands.find(
      (command) => command.name() === "render"
    );
    const renderSprigCommand = template?.commands.find(
      (command) => command.name() === "render-sprig"
    );

    expect(renderCommand?.options.some((option) => option.long === "--json")).toBe(
      true
    );
    expect(
      renderSprigCommand?.options.some((option) => option.long === "--json")
    ).toBe(true);
  });
});
