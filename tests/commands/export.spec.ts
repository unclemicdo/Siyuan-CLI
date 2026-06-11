import { afterEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../../src/cli.js";
import type { ExportApi } from "../../src/commands/export.js";
import { SiyuanCliError } from "../../src/core/errors.js";
import { SiyuanClient } from "../../src/core/client.js";
import * as coreIndex from "../../src/core/index.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
  delete process.env.SIYUAN_TOKEN;
});

function createExportCli(
  exportApi: ExportApi,
  write = vi.fn(() => true)
) {
  const cli = createCli({
    exportApi,
    write
  });
  cli.exitOverride();
  return { cli, write };
}

describe("export commands", () => {
  it("exports document resources with an optional name override", async () => {
    const write = vi.fn(() => true);
    const resources = vi.fn(async (input: { id: string; name?: string }) => ({
      path: `/tmp/${input.name ?? input.id}.zip`
    }));
    const { cli } = createExportCli({ resources }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "export",
      "resources",
      "--id",
      "doc-1",
      "--name",
      "bundle-name",
      "--json"
    ]);

    expect(resources).toHaveBeenCalledWith({
      id: "doc-1",
      name: "bundle-name"
    });

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "export.resources",
        data: {
          path: "/tmp/bundle-name.zip"
        }
      })
    );
  });

  it("passes an omitted name through as undefined", async () => {
    const write = vi.fn(() => true);
    const resources = vi.fn(async () => ({ path: "/tmp/doc-1.zip" }));
    const { cli } = createExportCli({ resources }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "export",
      "resources",
      "--id",
      "doc-1",
      "--json"
    ]);

    expect(resources).toHaveBeenCalledWith({
      id: "doc-1",
      name: undefined
    });
  });

  it("emits structured JSON errors for resource export failures", async () => {
    const write = vi.fn(() => true);
    const resources = vi.fn(async () => {
      throw new SiyuanCliError("API_NETWORK_ERROR", "Export failed", {
        id: "doc-1"
      });
    });
    const { cli } = createExportCli({ resources }, write);

    await cli.parseAsync([
      "node",
      "sy",
      "export",
      "resources",
      "--id",
      "doc-1",
      "--json"
    ]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: false,
        command: "export.resources",
        error: {
          code: "API_NETWORK_ERROR",
          message: "Export failed",
          details: {
            id: "doc-1"
          }
        }
      })
    );
    expect(process.exitCode).toBe(1);
  });

  it("registers export resources with json support", () => {
    const resources = vi.fn(async () => ({}));
    const { cli } = createExportCli({ resources });
    const exportCommand = cli.commands.find((command) => command.name() === "export");
    const resourcesCommand = exportCommand?.commands.find(
      (command) => command.name() === "resources"
    );

    expect(resourcesCommand?.options.some((option) => option.long === "--json")).toBe(
      true
    );
  });

  it("client exportResources posts official workspace-relative paths payloads", async () => {
    const post = vi.fn(async () => ({
      data: {
        code: 0,
        msg: "ok",
        data: {}
      }
    }));
    const client = new SiyuanClient({ post } as never);

    await client.exportResources({
      paths: ["/data/assets/example.png"],
      name: "bundle-name"
    } as never);

    expect(post).toHaveBeenCalledWith("/api/export/exportResources", {
      paths: ["/data/assets/example.png"],
      name: "bundle-name"
    });
  });

  it("default export resources resolves a doc id into /data/assets paths before calling the official endpoint", async () => {
    process.env.SIYUAN_TOKEN = "test-token";
    const post = vi.fn(async (endpoint: string, body: unknown) => {
      if (endpoint === "/api/block/getBlockInfo") {
        return {
          data: {
            code: 0,
            msg: "ok",
            data: { rootID: "doc-1" }
          }
        };
      }

      if (endpoint === "/api/export/exportMdContent") {
        return {
          data: {
            code: 0,
            msg: "ok",
            data: {
              content: [
                "# Demo",
                "![Img](assets/a.png)",
                "[File](assets/b.pdf)",
                '<img src="assets/c.jpg" />',
                "![Img](assets/a.png)"
              ].join("\n")
            }
          }
        };
      }

      if (endpoint === "/api/export/exportResources") {
        return {
          data: {
            code: 0,
            msg: "ok",
            data: { path: "temp/export/bundle.zip" }
          }
        };
      }

      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    vi.spyOn(coreIndex, "createHttpClient").mockReturnValue({ post } as never);

    const write = vi.fn(() => true);
    const cli = createCli({ write });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "export",
      "resources",
      "--id",
      "block-1",
      "--name",
      "bundle",
      "--json"
    ]);

    expect(post).toHaveBeenNthCalledWith(1, "/api/block/getBlockInfo", { id: "block-1" });
    expect(post).toHaveBeenNthCalledWith(2, "/api/export/exportMdContent", { id: "doc-1" });
    expect(post).toHaveBeenNthCalledWith(3, "/api/export/exportResources", {
      paths: [
        "/data/assets/a.png",
        "/data/assets/b.pdf",
        "/data/assets/c.jpg"
      ],
      name: "bundle"
    });

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "export.resources",
        data: { path: "temp/export/bundle.zip" }
      })
    );
  });

  it("returns a structured error when the document has no asset references", async () => {
    process.env.SIYUAN_TOKEN = "test-token";
    const post = vi.fn(async (endpoint: string) => {
      if (endpoint === "/api/block/getBlockInfo") {
        return {
          data: {
            code: 0,
            msg: "ok",
            data: { rootID: "doc-1" }
          }
        };
      }

      if (endpoint === "/api/export/exportMdContent") {
        return {
          data: {
            code: 0,
            msg: "ok",
            data: { content: "# No assets here" }
          }
        };
      }

      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    vi.spyOn(coreIndex, "createHttpClient").mockReturnValue({ post } as never);

    const write = vi.fn(() => true);
    const cli = createCli({ write });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "export",
      "resources",
      "--id",
      "doc-1",
      "--json"
    ]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: false,
        command: "export.resources",
        error: expect.objectContaining({
          code: "EXPORT_RESOURCES_NOT_FOUND",
          message: "No asset references found in document markdown"
        })
      })
    );
    expect(process.exitCode).toBe(1);
  });
});
