import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { registerFileCommands, type FileApi } from "../../src/commands/file.js";
import { SiyuanCliError } from "../../src/core/errors.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

function createFileCli(fileApi: FileApi, write = vi.fn(() => true)) {
  const cli = new Command().name("sy");
  registerFileCommands(cli, { fileApi, write });
  cli.exitOverride();
  return { cli, write };
}

describe("file commands", () => {
  it("stores managed cache, export, report, and staging content through injected file api methods", async () => {
    const write = vi.fn(() => true);
    const put = vi.fn(
      async (input: {
        path: string;
        content: string;
        overwrite?: boolean;
      }) => ({
        path: input.path,
        bytes: Buffer.byteLength(input.content, "utf8"),
        overwritten: input.overwrite ?? false
      })
    );
    const { cli } = createFileCli(
      {
        put,
        get: async () => ({}),
        list: async () => [],
        remove: async () => ({})
      },
      write
    );

    const dataDir = mkdtempSync(join(tmpdir(), "siyuan-cli-file-put-"));
    const cachePath = join(dataDir, "feed.json");
    const exportPath = join(dataDir, "export.md");
    const reportPath = join(dataDir, "daily.txt");
    const stagePath = join(dataDir, "draft.md");
    writeFileSync(cachePath, "{\"ok\":true}", "utf8");
    writeFileSync(exportPath, "# Export", "utf8");
    writeFileSync(reportPath, "Summary", "utf8");
    writeFileSync(stagePath, "Staged", "utf8");
    try {
      await cli.parseAsync([
        "node",
        "sy",
        "file",
        "put-cache",
        "--name",
        "feed.json",
        "--content-file",
        cachePath,
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "file",
        "put-export",
        "--name",
        "export.md",
        "--content-file",
        exportPath,
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "file",
        "put-report",
        "--name",
        "daily.txt",
        "--content-file",
        reportPath,
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "file",
        "stage-put",
        "--name",
        "draft.md",
        "--content-file",
        stagePath,
        "--json"
      ]);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }

    expect(put).toHaveBeenNthCalledWith(1, {
      path: "data/.sy-cli/cache/feed.json",
      content: "{\"ok\":true}",
      overwrite: false
    });
    expect(put).toHaveBeenNthCalledWith(2, {
      path: "data/.sy-cli/exports/export.md",
      content: "# Export",
      overwrite: false
    });
    expect(put).toHaveBeenNthCalledWith(3, {
      path: "data/.sy-cli/reports/daily.txt",
      content: "Summary",
      overwrite: false
    });
    expect(put).toHaveBeenNthCalledWith(4, {
      path: "/tmp/sy-cli/staging/draft.md",
      content: "Staged",
      overwrite: false
    });
  });

  it("reads file content from --content-file and removes the input file when cleanup is requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-file-put-"));
    const contentPath = join(tempDir, "report.txt");
    writeFileSync(contentPath, "Daily report\nLine 2\n", "utf8");

    const write = vi.fn(() => true);
    const put = vi.fn(async (input: { path: string; content: string }) => ({
      path: input.path,
      bytes: Buffer.byteLength(input.content, "utf8")
    }));
    const { cli } = createFileCli(
      {
        put,
        get: async () => ({}),
        list: async () => [],
        remove: async () => ({})
      },
      write
    );

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "file",
        "put-report",
        "--name",
        "daily.txt",
        "--content-file",
        contentPath,
        "--cleanup-input-file",
        "--json"
      ]);

      expect(put).toHaveBeenCalledWith({
        path: "data/.sy-cli/reports/daily.txt",
        content: "Daily report\nLine 2\n",
        overwrite: false
      });
      expect(existsSync(contentPath)).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("routes get, list, and remove commands through injected file api methods", async () => {
    const write = vi.fn(() => true);
    const get = vi.fn(async (path: string) => ({
      path,
      content: "cached text"
    }));
    const list = vi.fn(async (path: string) => [
      { name: `${path}-a.txt`, size: 10 },
      { name: `${path}-b.txt`, size: 20 }
    ]);
    const remove = vi.fn(async (input: { path: string; force: boolean }) => ({
      removed: true,
      path: input.path,
      force: input.force
    }));
    const { cli } = createFileCli(
      {
        put: async () => ({}),
        get,
        list,
        remove
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "file",
      "get",
      "--scope",
      "cache",
      "--name",
      "draft.md",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "file",
      "list",
      "--scope",
      "cache",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "file",
      "remove",
      "--scope",
      "report",
      "--name",
      "daily.txt",
      "--force",
      "--json"
    ]);

    expect(get).toHaveBeenCalledWith("data/.sy-cli/cache/draft.md");
    expect(list).toHaveBeenCalledWith("data/.sy-cli/cache");
    expect(remove).toHaveBeenCalledWith({
      path: "data/.sy-cli/reports/daily.txt",
      force: true
    });

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "file.get",
        data: {
          path: "data/.sy-cli/cache/draft.md",
          content: "cached text"
        }
      })
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "file.list",
        data: [
          { name: "data/.sy-cli/cache-a.txt", size: 10 },
          { name: "data/.sy-cli/cache-b.txt", size: 20 }
        ]
      })
    );
    expect(payloads[2]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "file.remove",
        data: {
          removed: true,
          path: "data/.sy-cli/reports/daily.txt",
          force: true
        }
      })
    );
  });

  it("returns structured json errors for file command failures", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const { cli } = createFileCli(
      {
        put: async () => {
          throw new SiyuanCliError("FILE_EXISTS", "Managed file already exists", {
            path: "data/.sy-cli/cache/feed.json"
          });
        },
        get: async () => ({}),
        list: async () => [],
        remove: async () => ({})
      },
      write
    );

    const errDir = mkdtempSync(join(tmpdir(), "siyuan-cli-file-error-"));
    const errPath = join(errDir, "data.json");
    writeFileSync(errPath, "{}", "utf8");
    try {
      await cli.parseAsync([
        "node",
        "sy",
        "file",
        "put-cache",
        "--name",
        "feed.json",
        "--content-file",
        errPath,
        "--json"
      ]);
    } finally {
      rmSync(errDir, { recursive: true, force: true });
    }

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: false,
        command: "file.put-cache",
        error: {
          code: "FILE_EXISTS",
          message: "Managed file already exists",
          details: {
            path: "data/.sy-cli/cache/feed.json"
          }
        }
      })
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("rejects unsafe file names before calling the file api", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const get = vi.fn(async () => ({}));
    const { cli } = createFileCli(
      {
        put: async () => ({}),
        get,
        list: async () => [],
        remove: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "file",
      "get",
      "--scope",
      "cache",
      "--name",
      "../bad",
      "--json"
    ]);

    expect(get).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("file.get");
    expect(payload.error.code).toBe("FILE_UNSAFE_PATH");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("requires --force for remove", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const remove = vi.fn(async () => ({}));
    const { cli } = createFileCli(
      {
        put: async () => ({}),
        get: async () => ({}),
        list: async () => [],
        remove
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "file",
      "remove",
      "--scope",
      "report",
      "--name",
      "daily.txt",
      "--json"
    ]);

    expect(remove).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("file.remove");
    expect(payload.error.code).toBe("VALIDATION_MISSING_OPTION");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});
