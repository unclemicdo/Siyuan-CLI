import { afterEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../../src/cli.js";
import { SiyuanCliError } from "../../src/core/errors.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("path helper commands", () => {
  it("routes path helper commands through injected path api methods", async () => {
    const write = vi.fn(() => true);
    const docId = vi.fn(async (path: string) => ({ id: "doc-1", path }));
    const docHPath = vi.fn(async (id: string) => ({ id, hpath: "/Projects/Doc" }));
    const docPath = vi.fn(async (id: string) => ({ id, path: "/data/20260101010101.sy" }));
    const docIds = vi.fn(async (paths: string[]) =>
      paths.map((path, index) => ({ id: `doc-${index + 1}`, path }))
    );
    const blockDoc = vi.fn(async (id: string) => ({ id, docId: "doc-1" }));
    const blockRoot = vi.fn(async (id: string) => ({ id, rootId: "root-1" }));
    const blockHPath = vi.fn(async (id: string) => ({ id, hpath: "/Projects/Doc" }));

    const cli = createCli({
      pathApi: {
        docId,
        docHPath,
        docPath,
        docIds,
        blockDoc,
        blockRoot,
        blockHPath
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "doc-id",
      "--path",
      "/Projects/Doc",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "doc-hpath",
      "--id",
      "doc-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "doc-path",
      "--id",
      "doc-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "doc-ids",
      "--path",
      "/Projects/Doc",
      "/Projects/Notes",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "block-doc",
      "--id",
      "block-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "block-root",
      "--id",
      "block-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "block-hpath",
      "--id",
      "block-1",
      "--json"
    ]);

    expect(docId).toHaveBeenCalledWith("/Projects/Doc");
    expect(docHPath).toHaveBeenCalledWith("doc-1");
    expect(docPath).toHaveBeenCalledWith("doc-1");
    expect(docIds).toHaveBeenCalledWith(["/Projects/Doc", "/Projects/Notes"]);
    expect(blockDoc).toHaveBeenCalledWith("block-1");
    expect(blockRoot).toHaveBeenCalledWith("block-1");
    expect(blockHPath).toHaveBeenCalledWith("block-1");

    const payloads = write.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "path.doc-id",
        data: { id: "doc-1", path: "/Projects/Doc" }
      })
    );
    expect(payloads[3]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "path.doc-ids",
        data: [
          { id: "doc-1", path: "/Projects/Doc" },
          { id: "doc-2", path: "/Projects/Notes" }
        ]
      })
    );
    expect(payloads[6]).toEqual(
      expect.objectContaining({
        ok: true,
        command: "path.block-hpath",
        data: { id: "block-1", hpath: "/Projects/Doc" }
      })
    );
  });

  it("returns structured path helper errors in json mode", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const cli = createCli({
      pathApi: {
        docId: async () => {
          throw new SiyuanCliError("PATH_NOT_FOUND", "Document path not found");
        },
        docHPath: async () => ({}),
        docPath: async () => ({}),
        docIds: async () => [],
        blockDoc: async () => ({}),
        blockRoot: async () => ({}),
        blockHPath: async () => ({})
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "path",
      "doc-id",
      "--path",
      "/Missing/Doc",
      "--json"
    ]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("path.doc-id");
    expect(payload.error.code).toBe("PATH_NOT_FOUND");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});
