import { afterEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../../src/cli.js";
import { SiyuanClient } from "../../src/core/client.js";
import { blockBatch } from "../../src/workflows/block-batch.js";
import { docUpsert } from "../../src/workflows/doc-upsert.js";
import { sqlReport } from "../../src/workflows/sql-report.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("docUpsert", () => {
  it("creates a document when resolvePath returns null and appends content", async () => {
    const calls: string[] = [];

    const result = await docUpsert(
      {
        resolvePath: async () => null,
        createDoc: async () => {
          calls.push("create");
          return { id: "doc-1" };
        },
        appendBlock: async () => {
          calls.push("append");
          return { id: "block-1" };
        }
      },
      {
        notebook: "nb-1",
        path: "/Projects/Siyuan CLI",
        append: "Hello"
      }
    );

    expect(calls).toEqual(["create", "append"]);
    expect(result).toEqual({ docId: "doc-1", created: true });
  });

  it("reuses an existing document when resolvePath returns an id", async () => {
    const createDoc = vi.fn(async () => ({ id: "doc-new" }));
    const appendBlock = vi.fn(async () => ({ id: "block-1" }));

    const result = await docUpsert(
      {
        resolvePath: async () => ({ id: "doc-existing" }),
        createDoc,
        appendBlock
      },
      {
        notebook: "nb-1",
        path: "/Projects/Siyuan CLI",
        append: "Hello again"
      }
    );

    expect(createDoc).not.toHaveBeenCalled();
    expect(appendBlock).toHaveBeenCalledWith({
      parentID: "doc-existing",
      data: "Hello again",
      dataType: "markdown"
    });
    expect(result).toEqual({ docId: "doc-existing", created: false });
  });
});

describe("blockBatch", () => {
  it("returns per-item status for append and update operations", async () => {
    const result = await blockBatch(
      {
        appendBlock: async (payload) => ({ kind: "append", payload }),
        updateBlock: async (payload) => {
          if ((payload as { id: string }).id === "bad") {
            throw new Error("update failed");
          }

          return { kind: "update", payload };
        }
      },
      [
        {
          op: "append",
          payload: { parentID: "doc-1", data: "hello", dataType: "markdown" }
        },
        {
          op: "update",
          payload: { id: "bad", data: "oops", dataType: "markdown" }
        }
      ]
    );

    expect(result).toEqual({
      results: [
        {
          op: "append",
          ok: true,
          data: {
            kind: "append",
            payload: { parentID: "doc-1", data: "hello", dataType: "markdown" }
          }
        },
        {
          op: "update",
          ok: false,
          error: { message: "update failed" }
        }
      ]
    });
  });
});

describe("sqlReport", () => {
  it("returns row counts alongside rows", async () => {
    const result = await sqlReport(
      {
        query: async () => [{ id: "b1" }, { id: "b2" }]
      },
      "SELECT id FROM blocks LIMIT 2"
    );

    expect(result).toEqual({
      rowCount: 2,
      rows: [{ id: "b1" }, { id: "b2" }]
    });
  });
});

describe("workflow commands", () => {
  it("passes empty markdown when default workflow doc-upsert creates a new doc", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const previousToken = process.env.SIYUAN_TOKEN;
    const previousBaseUrl = process.env.SIYUAN_BASE_URL;
    process.env.SIYUAN_TOKEN = "test-token";
    process.env.SIYUAN_BASE_URL = "http://127.0.0.1:6806";

    const querySql = vi
      .spyOn(SiyuanClient.prototype, "querySql")
      .mockResolvedValue([]);
    const createDoc = vi
      .spyOn(SiyuanClient.prototype, "createDoc")
      .mockImplementation(async (input) =>
        input.markdown === "" ? "doc-1" : null
      );
    const appendBlock = vi
      .spyOn(SiyuanClient.prototype, "appendBlock")
      .mockResolvedValue([{ id: "block-1" }]);

    const cli = createCli();
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "workflow",
      "doc-upsert",
      "--notebook",
      "nb-1",
      "--path",
      "/Projects/New-Doc",
      "--append",
      "Hello",
      "--json"
    ]);

    expect(querySql).toHaveBeenCalledTimes(1);
    expect(createDoc).toHaveBeenCalledWith({
      notebook: "nb-1",
      path: "/Projects/New-Doc",
      markdown: ""
    });
    expect(appendBlock).toHaveBeenCalledWith({
      parentID: "doc-1",
      data: "Hello",
      dataType: "markdown"
    });

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "workflow.doc-upsert",
        data: {
          docId: "doc-1",
          created: true
        }
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

  it("runs workflow sql-report in json mode", async () => {
    const write = vi.fn(() => true);
    const query = vi.fn(async () => [{ id: "b1" }]);
    const cli = createCli({
      workflowApi: {
        resolvePath: async () => null,
        createDoc: async () => ({ id: "doc-1" }),
        appendBlock: async () => ({ id: "block-1" }),
        updateBlock: async () => ({ id: "block-1" }),
        query
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "workflow",
      "sql-report",
      "--stmt",
      "SELECT id FROM blocks LIMIT 1",
      "--json"
    ]);

    expect(query).toHaveBeenCalledWith("SELECT id FROM blocks LIMIT 1");
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "workflow.sql-report",
        data: {
          rowCount: 1,
          rows: [{ id: "b1" }]
        }
      })
    );
  });
});
