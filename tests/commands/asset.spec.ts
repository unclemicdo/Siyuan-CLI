import { afterEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../../src/cli.js";
import { SiyuanCliError } from "../../src/core/errors.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("asset commands", () => {
  it("uploads an asset from an explicit local file path with an optional upload name", async () => {
    const write = vi.fn(() => true);
    const upload = vi.fn(async (input: {
      filePath: string;
      uploadName?: string;
    }) => ({
      succMap: {
        [input.uploadName ?? "example.txt"]: "/assets/example.txt"
      },
      errFiles: []
    }));

    const cli = createCli({
      assetApi: { upload },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "asset",
      "upload",
      "--file",
      "/tmp/example.txt",
      "--upload-name",
      "renamed.txt",
      "--json"
    ]);

    expect(upload).toHaveBeenCalledWith({
      filePath: "/tmp/example.txt",
      uploadName: "renamed.txt"
    });

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "asset.upload",
        data: {
          succMap: {
            "renamed.txt": "/assets/example.txt"
          },
          errFiles: []
        }
      })
    );
  });

  it("passes an omitted upload name through as undefined", async () => {
    const write = vi.fn(() => true);
    const upload = vi.fn(async () => ({
      succMap: { "example.txt": "/assets/example.txt" },
      errFiles: []
    }));

    const cli = createCli({
      assetApi: { upload },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "asset",
      "upload",
      "--file",
      "/tmp/example.txt",
      "--json"
    ]);

    expect(upload).toHaveBeenCalledWith({
      filePath: "/tmp/example.txt",
      uploadName: undefined
    });
  });

  it("emits structured JSON errors for upload failures", async () => {
    const write = vi.fn(() => true);
    const upload = vi.fn(async () => {
      throw new SiyuanCliError("API_NETWORK_ERROR", "Upload failed", {
        filePath: "/tmp/example.txt"
      });
    });

    const cli = createCli({
      assetApi: { upload },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "asset",
      "upload",
      "--file",
      "/tmp/example.txt",
      "--json"
    ]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: false,
        command: "asset.upload",
        error: {
          code: "API_NETWORK_ERROR",
          message: "Upload failed",
          details: {
            filePath: "/tmp/example.txt"
          }
        }
      })
    );
    expect(process.exitCode).toBe(1);
  });
});
