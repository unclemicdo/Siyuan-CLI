import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCli } from "../../src/cli.js";
import { SiyuanClient } from "../../src/core/client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notebook commands", () => {
  it("creates, opens, and closes notebooks through injected notebookApi methods", async () => {
    const write = vi.fn(() => true);
    const create = vi.fn(async (name: string) => ({ notebook: { id: "nb-1", name } }));
    const open = vi.fn(async (notebook: string) => ({ opened: notebook }));
    const close = vi.fn(async (notebook: string) => ({ closed: notebook }));

    const cli = createCli({
      notebookApi: {
        list: async () => ({ notebooks: [] }),
        create,
        open,
        close
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "notebook",
      "create",
      "--name",
      "Work",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "notebook",
      "open",
      "--notebook",
      "nb-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "notebook",
      "close",
      "--notebook",
      "nb-1",
      "--json"
    ]);

    expect(create).toHaveBeenCalledWith("Work");
    expect(open).toHaveBeenCalledWith("nb-1");
    expect(close).toHaveBeenCalledWith("nb-1");

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "notebook.create",
        data: { notebook: { id: "nb-1", name: "Work" } }
      })
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "notebook.open",
        data: { opened: "nb-1" }
      })
    );
    expect(payloads[2]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "notebook.close",
        data: { closed: "nb-1" }
      })
    );
  });
});

describe("doc commands", () => {
  it("creates and exports documents through injected docApi methods", async () => {
    const write = vi.fn(() => true);
    const create = vi.fn(async (input: {
      notebook: string;
      path: string;
      markdown?: string;
    }) => ({ id: "doc-1", ...input }));
    const exportMarkdown = vi.fn(async (id: string) => ({
      hPath: "/Work/Doc",
      content: `# ${id}`
    }));

    const cli = createCli({
      docApi: {
        create,
        exportMarkdown
      },
      write
    });
    cli.exitOverride();

    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-markdown-"));
    const markdownPath = join(tempDir, "doc.md");
    writeFileSync(markdownPath, "# Hello", "utf8");
    try {
      await cli.parseAsync([
        "node",
        "sy",
        "doc",
        "create",
        "--notebook",
        "nb-1",
        "--path",
        "/Work/Doc",
        "--markdown-file",
        markdownPath,
        "--json"
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
    await cli.parseAsync([
      "node",
      "sy",
      "doc",
      "export-md",
      "--id",
      "doc-1",
      "--json"
    ]);

    expect(create).toHaveBeenCalledWith({
      notebook: "nb-1",
      path: "/Work/Doc",
      markdown: "# Hello"
    });
    expect(exportMarkdown).toHaveBeenCalledWith("doc-1");

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "doc.create",
        data: {
          id: "doc-1",
          notebook: "nb-1",
          path: "/Work/Doc",
          markdown: "# Hello"
        }
      })
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "doc.export-md",
        data: {
          hPath: "/Work/Doc",
          content: "# doc-1"
        }
      })
    );
  });

  it("creates documents from markdown files while preserving real newlines", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-markdown-"));
    const markdownPath = join(tempDir, "doc.md");
    const markdown = [
      "# SiYuan Agent Workbench E2E Test",
      "",
      "- status: `todo`",
      "- owner: `agent`",
      "- need_human: `false`",
      "",
      "## Task",
      "验证 agent 安全写入、评论线程、PDCA 复盘追加。"
    ].join("\n");
    writeFileSync(markdownPath, markdown, "utf8");

    const write = vi.fn(() => true);
    const create = vi.fn(async (input: {
      notebook: string;
      path: string;
      markdown?: string;
    }) => ({ id: "doc-file", ...input }));

    const cli = createCli({
      docApi: {
        create,
        exportMarkdown: async () => ({ hPath: "/x", content: "" })
      },
      write
    });
    cli.exitOverride();

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "doc",
        "create",
        "--notebook",
        "nb-1",
        "--path",
        "/Work/FileDoc",
        "--markdown-file",
        markdownPath,
        "--json"
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(create).toHaveBeenCalledWith({
      notebook: "nb-1",
      path: "/Work/FileDoc",
      markdown
    });
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.data.markdown).toBe(markdown);
  });

  it("removes markdown input files after successful create when cleanup is requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-markdown-cleanup-"));
    const markdownPath = join(tempDir, "doc.md");
    writeFileSync(markdownPath, "# Cleanup", "utf8");

    const write = vi.fn(() => true);
    const create = vi.fn(async (input: {
      notebook: string;
      path: string;
      markdown?: string;
    }) => ({ id: "doc-clean", ...input }));

    const cli = createCli({
      docApi: {
        create,
        exportMarkdown: async () => ({ hPath: "/x", content: "" })
      },
      write
    });
    cli.exitOverride();

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "doc",
        "create",
        "--notebook",
        "nb-1",
        "--path",
        "/Work/CleanupDoc",
        "--markdown-file",
        markdownPath,
        "--cleanup-input-file",
        "--json"
      ]);

      expect(existsSync(markdownPath)).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(create).toHaveBeenCalledWith({
      notebook: "nb-1",
      path: "/Work/CleanupDoc",
      markdown: "# Cleanup"
    });
  });

  it("keeps markdown input files when create fails even if cleanup is requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-markdown-keep-"));
    const markdownPath = join(tempDir, "doc.md");
    writeFileSync(markdownPath, "# Keep", "utf8");

    const write = vi.fn(() => true);
    const create = vi.fn(async () => {
      throw new Error("boom");
    });

    const cli = createCli({
      docApi: {
        create,
        exportMarkdown: async () => ({ hPath: "/x", content: "" })
      },
      write
    });
    cli.exitOverride();

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "doc",
        "create",
        "--notebook",
        "nb-1",
        "--path",
        "/Work/KeepDoc",
        "--markdown-file",
        markdownPath,
        "--cleanup-input-file",
        "--json"
      ]);

      expect(existsSync(markdownPath)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
  });

  it("renames, moves, removes, and resolves documents through injected docApi methods", async () => {
    const write = vi.fn(() => true);
    const rename = vi.fn(async (id: string, title: string) => ({ id, title }));
    const move = vi.fn(async (fromIDs: string[], toID: string) => ({
      fromIDs,
      toID
    }));
    const remove = vi.fn(async (id: string, force?: boolean) => ({ id, force }));
    const resolvePath = vi.fn(async (path: string) => ({
      id: "doc-1",
      path
    }));

    const cli = createCli({
      docApi: {
        create: async () => ({ id: "doc-x" }),
        exportMarkdown: async () => ({ hPath: "/x", content: "" }),
        rename,
        move,
        remove,
        resolvePath
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "doc",
      "rename",
      "--id",
      "doc-1",
      "--title",
      "Renamed",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "doc",
      "move",
      "--from-id",
      "doc-1",
      "--to-id",
      "nb-2",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "doc",
      "remove",
      "--id",
      "doc-1",
      "--force",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "doc",
      "resolve-path",
      "--path",
      "/Work/Doc",
      "--json"
    ]);

    expect(rename).toHaveBeenCalledWith("doc-1", "Renamed");
    expect(move).toHaveBeenCalledWith(["doc-1"], "nb-2");
    expect(remove).toHaveBeenCalledWith("doc-1", true);
    expect(resolvePath).toHaveBeenCalledWith("/Work/Doc");

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[2]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "doc.remove",
        data: { id: "doc-1", force: true }
      })
    );
    expect(payloads[3]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "doc.resolve-path",
        data: { id: "doc-1", path: "/Work/Doc" }
      })
    );
  });

  it("accepts notebook-prefixed paths for the default doc resolve-path path", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const previousToken = process.env.SIYUAN_TOKEN;
    const previousBaseUrl = process.env.SIYUAN_BASE_URL;
    process.env.SIYUAN_TOKEN = "test-token";
    process.env.SIYUAN_BASE_URL = "http://127.0.0.1:6806";

    const querySql = vi
      .spyOn(SiyuanClient.prototype, "querySql")
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "doc-1" }]);

    const cli = createCli();
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "doc",
      "resolve-path",
      "--path",
      "/Notebook/Projects/Doc",
      "--json"
    ]);

    expect(querySql).toHaveBeenNthCalledWith(
      1,
      "SELECT id FROM blocks WHERE type = 'd' AND hpath = '/Notebook/Projects/Doc' ORDER BY updated DESC LIMIT 1"
    );
    expect(querySql).toHaveBeenNthCalledWith(
      2,
      "SELECT id FROM blocks WHERE type = 'd' AND hpath = '/Projects/Doc' ORDER BY updated DESC LIMIT 1"
    );

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "doc.resolve-path",
        data: { id: "doc-1" }
      })
    );

    if (previousToken === undefined) {
      delete process.env.SIYUAN_TOKEN;
    } else {
      process.env.SIYUAN_TOKEN = previousToken;
    }

    if (previousBaseUrl === undefined) {
      delete process.env.SIYUAN_BASE_URL;
    } else {
      process.env.SIYUAN_BASE_URL = previousBaseUrl;
    }

    write.mockRestore();
  });
});

describe("block commands", () => {
  it("reads a block and appends content through injected blockApi methods", async () => {
    const write = vi.fn(() => true);
    const get = vi.fn(async (id: string) => ({ id, kramdown: "# Existing" }));
    const append = vi.fn(async (input: {
      parentID: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: "block-2", ...input }]);

    const cli = createCli({
      blockApi: {
        get,
        append
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "block",
      "get",
      "--id",
      "block-1",
      "--json"
    ]);
    const appendDir = mkdtempSync(join(tmpdir(), "siyuan-cli-append-"));
    const appendPath = join(appendDir, "data.md");
    writeFileSync(appendPath, "Hello", "utf8");
    try {
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "append",
        "--parent-id",
        "doc-1",
        "--data-file",
        appendPath,
        "--json"
      ]);
    } finally {
      rmSync(appendDir, { recursive: true, force: true });
    }

    expect(get).toHaveBeenCalledWith("block-1");
    expect(append).toHaveBeenCalledWith({
      parentID: "doc-1",
      data: "Hello",
      dataType: "markdown"
    });

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "block.get",
        data: { id: "block-1", kramdown: "# Existing" }
      })
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "block.append",
        data: [
          {
            id: "block-2",
            parentID: "doc-1",
            data: "Hello",
            dataType: "markdown"
          }
        ]
      })
    );
  });

  it("appends block content from data files while preserving real newlines", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-block-"));
    const dataPath = join(tempDir, "block.md");
    const data = [
      "- source_block: `doc-1`",
      "  author: `agent`",
      "  comment_status: `open`",
      "  body: 端到端测试：agent 追加评论块。"
    ].join("\n");
    writeFileSync(dataPath, data, "utf8");

    const write = vi.fn(() => true);
    const append = vi.fn(async (input: {
      parentID: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: "block-file", ...input }]);

    const cli = createCli({
      blockApi: {
        get: async () => ({ id: "block-1" }),
        append
      },
      write
    });
    cli.exitOverride();

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "append",
        "--parent-id",
        "doc-1",
        "--data-file",
        dataPath,
        "--json"
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(append).toHaveBeenCalledWith({
      parentID: "doc-1",
      data,
      dataType: "markdown"
    });
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.data[0].data).toBe(data);
  });

  it("removes block input files after successful append when cleanup is requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-block-cleanup-"));
    const dataPath = join(tempDir, "block.md");
    writeFileSync(dataPath, "cleanup block", "utf8");

    const write = vi.fn(() => true);
    const append = vi.fn(async (input: {
      parentID: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: "block-clean", ...input }]);

    const cli = createCli({
      blockApi: {
        get: async () => ({ id: "block-1" }),
        append
      },
      write
    });
    cli.exitOverride();

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "append",
        "--parent-id",
        "doc-1",
        "--data-file",
        dataPath,
        "--cleanup-input-file",
        "--json"
      ]);

      expect(existsSync(dataPath)).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(append).toHaveBeenCalledWith({
      parentID: "doc-1",
      data: "cleanup block",
      dataType: "markdown"
    });
  });

  it("keeps block input files when append fails even if cleanup is requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-block-keep-"));
    const dataPath = join(tempDir, "block.md");
    writeFileSync(dataPath, "keep block", "utf8");

    const write = vi.fn(() => true);
    const append = vi.fn(async () => {
      throw new Error("append boom");
    });

    const cli = createCli({
      blockApi: {
        get: async () => ({ id: "block-1" }),
        append
      },
      write
    });
    cli.exitOverride();

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "append",
        "--parent-id",
        "doc-1",
        "--data-file",
        dataPath,
        "--cleanup-input-file",
        "--json"
      ]);

      expect(existsSync(dataPath)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
  });

  it("emits strict JSON for append responses containing multiline strings", async () => {
    const write = vi.fn(() => true);
    const append = vi.fn(async () => [
      {
        id: "block-2",
        data: "<div>line 1\nline 2</div>"
      }
    ]);

    const cli = createCli({
      blockApi: {
        get: async () => ({ id: "block-1" }),
        append
      },
      write
    });
    cli.exitOverride();

    const multilineDir = mkdtempSync(join(tmpdir(), "siyuan-cli-multiline-"));
    const multilinePath = join(multilineDir, "data.md");
    writeFileSync(multilinePath, "line 1\nline 2", "utf8");
    try {
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "append",
        "--parent-id",
        "doc-1",
        "--data-file",
        multilinePath,
        "--json"
      ]);
    } finally {
      rmSync(multilineDir, { recursive: true, force: true });
    }

    const output = String(write.mock.calls[0]?.[0] ?? "");
    expect(output).toContain("\\n");
    expect(JSON.parse(output)).toEqual(
      expect.objectContaining({
        ok: true,
        command: "block.append",
        data: [{ id: "block-2", data: "<div>line 1\nline 2</div>" }]
      })
    );
  });

  it("executes the remaining block mutation and inspection commands through injected blockApi methods", async () => {
    const write = vi.fn(() => true);
    const children = vi.fn(async (id: string) => [{ id: `${id}-child` }]);
    const prepend = vi.fn(async (input: {
      parentID: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: "block-prepend", ...input }]);
    const insertBefore = vi.fn(async (input: {
      nextID: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: "block-before", ...input }]);
    const insertAfter = vi.fn(async (input: {
      previousID: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: "block-after", ...input }]);
    const update = vi.fn(async (input: {
      id: string;
      data: string;
      dataType: "markdown" | "dom";
    }) => [{ id: input.id, updated: true }]);
    const remove = vi.fn(async (id: string) => ({ id, removed: true }));

    const cli = createCli({
      blockApi: {
        get: async () => ({ id: "block-1" }),
        append: async () => [{ id: "block-append" }],
        children,
        prepend,
        insertBefore,
        insertAfter,
        update,
        remove
      },
      write
    });
    cli.exitOverride();

    const dataDir = mkdtempSync(join(tmpdir(), "siyuan-cli-block-mutations-"));
    const prependFile = join(dataDir, "prepend.md");
    const beforeFile = join(dataDir, "before.md");
    const afterFile = join(dataDir, "after.md");
    const updateFile = join(dataDir, "update.md");
    writeFileSync(prependFile, "Top", "utf8");
    writeFileSync(beforeFile, "Before", "utf8");
    writeFileSync(afterFile, "After", "utf8");
    writeFileSync(updateFile, "Updated", "utf8");

    try {
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "children",
        "--id",
        "doc-1",
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "prepend",
        "--parent-id",
        "doc-1",
        "--data-file",
        prependFile,
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "insert-before",
        "--next-id",
        "block-2",
        "--data-file",
        beforeFile,
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "insert-after",
        "--previous-id",
        "block-2",
        "--data-file",
        afterFile,
        "--json"
      ]);
      await cli.parseAsync([
        "node",
        "sy",
        "block",
        "update",
        "--id",
        "block-2",
        "--data-file",
        updateFile,
        "--json"
      ]);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
    await cli.parseAsync([
      "node",
      "sy",
      "block",
      "remove",
      "--id",
      "block-2",
      "--json"
    ]);

    expect(children).toHaveBeenCalledWith("doc-1");
    expect(prepend).toHaveBeenCalledWith({
      parentID: "doc-1",
      data: "Top",
      dataType: "markdown"
    });
    expect(insertBefore).toHaveBeenCalledWith({
      nextID: "block-2",
      data: "Before",
      dataType: "markdown"
    });
    expect(insertAfter).toHaveBeenCalledWith({
      previousID: "block-2",
      data: "After",
      dataType: "markdown"
    });
    expect(update).toHaveBeenCalledWith({
      id: "block-2",
      data: "Updated",
      dataType: "markdown"
    });
    expect(remove).toHaveBeenCalledWith("block-2");

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "block.children",
        data: [{ id: "doc-1-child" }]
      })
    );
    expect(payloads[5]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "block.remove",
        data: { id: "block-2", removed: true }
      })
    );
  });
});

describe("attr commands", () => {
  it("reads and writes attrs through injected attrApi methods", async () => {
    const write = vi.fn(() => true);
    const get = vi.fn(async (id: string) => ({
      id,
      attrs: { "custom-priority": "high" }
    }));
    const set = vi.fn(async (id: string, attrs: Record<string, string>) => ({
      id,
      updated: attrs
    }));

    const cli = createCli({
      attrApi: {
        get,
        set
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "attr",
      "get",
      "--id",
      "block-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "attr",
      "set",
      "--id",
      "block-1",
      "--attrs",
      "{\"custom-priority\":\"low\"}",
      "--json"
    ]);

    expect(get).toHaveBeenCalledWith("block-1");
    expect(set).toHaveBeenCalledWith("block-1", {
      "custom-priority": "low"
    });

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "attr.get",
        data: {
          id: "block-1",
          attrs: { "custom-priority": "high" }
        }
      })
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "attr.set",
        data: {
          id: "block-1",
          updated: { "custom-priority": "low" }
        }
      })
    );
  });

  it("returns a structured validation error when --attrs is not valid JSON", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const cli = createCli({
      attrApi: {
        get: async () => ({}),
        set: async () => ({})
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "attr",
      "set",
      "--id",
      "block-1",
      "--attrs",
      "{bad json",
      "--json"
    ]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("attr.set");
    expect(payload.error.code).toBe("VALIDATION_INVALID_JSON");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});
