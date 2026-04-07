import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosResponse } from "axios";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createHttpClient,
  formatFailure,
  formatSuccess,
  SiyuanClient,
  SiyuanCliError,
  resolveConfig
} from "../../src/core/index.js";
import { createCli } from "../../src/cli.js";

let isolatedConfigHome = "";
let previousXdgConfigHome: string | undefined;

beforeEach(() => {
  isolatedConfigHome = mkdtempSync(join(tmpdir(), "siyuan-cli-xdg-config-"));
  previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = isolatedConfigHome;
});

afterEach(() => {
  vi.restoreAllMocks();

  if (previousXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
  }

  if (isolatedConfigHome) {
    rmSync(isolatedConfigHome, { recursive: true, force: true });
  }
});

describe("core contracts", () => {
  it("resolves base-url and timeout from explicit flags but token only from environment", () => {
    const result = resolveConfig({
      flags: {
        baseUrl: "http://127.0.0.1:6806",
        timeout: 5000,
        token: "flag-token"
      } as never,
      env: {
        SIYUAN_BASE_URL: "http://env.local:6806",
        SIYUAN_TOKEN: "env-token",
        SIYUAN_TIMEOUT: "15000"
      }
    });

    expect(result.baseUrl).toBe("http://127.0.0.1:6806");
    expect(result.token).toBe("env-token");
    expect(result.timeout).toBe(5000);
  });

  it("resolves config from environment when flags are omitted", () => {
    const result = resolveConfig({
      env: {
        SIYUAN_BASE_URL: "http://env.local:6806",
        SIYUAN_TOKEN: "env-token",
        SIYUAN_TIMEOUT: "12000"
      }
    });

    expect(result.baseUrl).toBe("http://env.local:6806");
    expect(result.token).toBe("env-token");
    expect(result.timeout).toBe(12000);
  });

  it("resolves config from a config file when env is omitted", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-config-"));
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        defaultProfile: "local",
        profiles: {
          local: {
            baseUrl: "http://config.local:6806",
            token: "config-token",
            timeout: 18000
          }
        }
      })
    );

    const result = resolveConfig({
      env: {},
      configFilePath: configPath
    });

    expect(result.baseUrl).toBe("http://config.local:6806");
    expect(result.token).toBe("config-token");
    expect(result.timeout).toBe(18000);
    expect(result.profile).toBe("local");

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("treats blank environment variables as missing and falls back to the config file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-config-"));
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        defaultProfile: "local",
        profiles: {
          local: {
            baseUrl: "http://config.local:6806",
            token: "config-token",
            timeout: 18000
          }
        }
      })
    );

    const result = resolveConfig({
      env: {
        SIYUAN_BASE_URL: "   ",
        SIYUAN_TOKEN: "",
        SIYUAN_TIMEOUT: "   "
      },
      configFilePath: configPath
    });

    expect(result.baseUrl).toBe("http://config.local:6806");
    expect(result.token).toBe("config-token");
    expect(result.timeout).toBe(18000);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("prefers an explicit profile over the config default profile", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "siyuan-cli-config-"));
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        defaultProfile: "local",
        profiles: {
          local: {
            baseUrl: "http://config.local:6806",
            token: "config-token",
            timeout: 18000
          },
          docker: {
            baseUrl: "http://docker.local:6806",
            token: "docker-token",
            timeout: 22000
          }
        }
      })
    );

    const result = resolveConfig({
      flags: { profile: "docker" },
      env: {},
      configFilePath: configPath
    });

    expect(result.baseUrl).toBe("http://docker.local:6806");
    expect(result.token).toBe("docker-token");
    expect(result.timeout).toBe(22000);
    expect(result.profile).toBe("docker");

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("throws CONFIG_MISSING_TOKEN when token cannot be resolved", () => {
    expect(() => resolveConfig({ env: {} })).toThrowError(
      expect.objectContaining({ code: "CONFIG_MISSING_TOKEN" })
    );
  });

  it("ignores an unsupported token value in flags", () => {
    expect(() =>
      resolveConfig({
        flags: { token: "flag-token" } as never,
        env: {}
      })
    ).toThrowError(expect.objectContaining({ code: "CONFIG_MISSING_TOKEN" }));
  });

  it("throws CONFIG_INVALID_TIMEOUT for a non-positive timeout", () => {
    expect(() =>
      resolveConfig({
        flags: { timeout: 0 },
        env: { SIYUAN_TOKEN: "env-token" }
      })
    ).toThrowError(expect.objectContaining({ code: "CONFIG_INVALID_TIMEOUT" }));
  });

  it("throws CONFIG_INVALID_BASE_URL for a non-http(s) base URL", () => {
    expect(() =>
      resolveConfig({
        flags: { baseUrl: "ftp://localhost:6806" },
        env: { SIYUAN_TOKEN: "env-token" }
      })
    ).toThrowError(
      expect.objectContaining({ code: "CONFIG_INVALID_BASE_URL" })
    );
  });

  it("formats success output with stable metadata", () => {
    const result = formatSuccess("system.version", { version: "3.1.0" }, 12);
    expect(result).toEqual({
      ok: true,
      command: "system.version",
      data: { version: "3.1.0" },
      meta: { duration_ms: 12 }
    });
  });

  it("exposes stable error codes", () => {
    const error = new SiyuanCliError("CONFIG_MISSING_TOKEN", "Missing token");
    expect(error.code).toBe("CONFIG_MISSING_TOKEN");
  });

  it("formats failures with JSON-safe details", () => {
    const circular = { name: "root" } as { name: string; self?: unknown };
    circular.self = circular;
    const error = new SiyuanCliError(
      "API_NETWORK_ERROR",
      "Network failed",
      circular
    );

    const result = formatFailure("system.version", error);

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("API_NETWORK_ERROR");
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result.error.details).toEqual({
      name: "root",
      self: "[Circular]"
    });
  });

  it("does not mark repeated shared references as circular", () => {
    const shared = { value: "same" };
    const error = new SiyuanCliError("API_NETWORK_ERROR", "Network failed", {
      a: shared,
      b: shared
    });

    const result = formatFailure("system.version", error);

    expect(result.error.details).toEqual({
      a: { value: "same" },
      b: { value: "same" }
    });
  });

  it("always emits a stable empty details object when missing", () => {
    const error = new SiyuanCliError("E", "msg");
    const result = formatFailure("system.version", error);

    expect(result.error.details).toEqual({});
    expect(JSON.parse(JSON.stringify(result)).error.details).toEqual({});
  });
});

describe("http client", () => {
  it("creates axios client with base settings and headers", () => {
    const http = createHttpClient({
      baseUrl: "http://127.0.0.1:6806",
      token: "test-token",
      timeout: 5000
    });
    const headers = http.defaults.headers as Record<string, unknown> & {
      common?: Record<string, unknown>;
    };

    expect(http.defaults.baseURL).toBe("http://127.0.0.1:6806");
    expect(http.defaults.timeout).toBe(5000);
    expect(headers.Authorization ?? headers.common?.Authorization).toBe(
      "Token test-token"
    );
    expect(headers["Content-Type"] ?? headers.common?.["Content-Type"]).toBe(
      "application/json"
    );
  });
});

describe("siyuan client", () => {
  it("unwraps data from a success envelope", async () => {
    const post = vi.fn(async () => {
      const response: AxiosResponse<{
        code: number;
        msg: string;
        data: { version: string };
      }> = {
        data: {
          code: 0,
          msg: "ok",
          data: { version: "3.1.0" }
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} }
      };
      return response;
    });
    const client = new SiyuanClient({ post } as never);

    const result = await client.post<{ version: string }>(
      "/api/system/version",
      {}
    );

    expect(post).toHaveBeenCalledWith("/api/system/version", {});
    expect(result).toEqual({ version: "3.1.0" });
  });

  it("maps nonzero envelopes to stable API errors", async () => {
    const post = vi.fn(async () => {
      const response: AxiosResponse<{ code: number; msg: string; data: null }> =
        {
          data: {
            code: -1,
            msg: "permission denied",
            data: null
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: { headers: {} }
        };
      return response;
    });
    const client = new SiyuanClient({ post } as never);

    await expect(client.post("/api/system/version", {})).rejects.toMatchObject({
      code: "API_RESPONSE_ERROR",
      message: "permission denied"
    });
  });

  it("rejects malformed success envelopes missing data", async () => {
    const post = vi.fn(async () => {
      const response: AxiosResponse<{ code: number; msg: string }> = {
        data: {
          code: 0,
          msg: "ok"
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} }
      };
      return response;
    });
    const client = new SiyuanClient({ post } as never);

    await expect(client.post("/api/system/version", {})).rejects.toMatchObject({
      code: "API_INVALID_RESPONSE"
    });
  });

  it("maps axios-style rejection to API_NETWORK_ERROR with stable details", async () => {
    const post = vi.fn(async () => {
      throw {
        isAxiosError: true,
        code: "ECONNABORTED",
        response: { status: 504 }
      };
    });
    const client = new SiyuanClient({ post } as never);

    await expect(client.post("/api/system/version", {})).rejects.toMatchObject({
      code: "API_NETWORK_ERROR",
      details: {
        endpoint: "/api/system/version",
        status: 504,
        axios_code: "ECONNABORTED"
      }
    });
  });

  it("passes force in removeDoc payload when requested", async () => {
    const post = vi.fn(async () => {
      const response: AxiosResponse<{
        code: number;
        msg: string;
        data: { removed: boolean };
      }> = {
        data: {
          code: 0,
          msg: "ok",
          data: { removed: true }
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} }
      };
      return response;
    });
    const client = new SiyuanClient({ post } as never);

    await client.removeDoc("doc-1", true);

    expect(post).toHaveBeenCalledWith("/api/filetree/removeDocByID", {
      id: "doc-1",
      force: true
    });
  });
});

describe("system command", () => {
  it("registers system version with --json support", () => {
    const cli = createCli();
    const system = cli.commands.find((command) => command.name() === "system");
    const version = system?.commands.find((command) => command.name() === "version");
    const hasJson = version?.options.some((option) => option.long === "--json");
    const rootOptions = cli.options.map((option) => option.long);

    expect(system).toBeDefined();
    expect(version).toBeDefined();
    expect(hasJson).toBe(true);
    expect(rootOptions).toEqual(
      expect.arrayContaining([
        "--base-url",
        "--timeout",
        "--profile"
      ])
    );
    expect(rootOptions).not.toContain("--token");
  });

  it("writes structured JSON for system version", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const version = vi.fn(async () => ({ version: "3.1.0" }));
    const cli = createCli({
      systemApi: {
        version,
        bootProgress: async () => ({ bootProgress: 100 }),
        time: async () => ({ time: 1712059200000 })
      }
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "version", "--json"]);

    expect(version).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalled();

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("system.version");
    expect(payload.data).toEqual({ version: "3.1.0" });
    expect(payload.meta).toEqual(expect.objectContaining({ duration_ms: expect.any(Number) }));

    write.mockRestore();
  });

  it("registers and executes system boot-progress and system time", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const bootProgress = vi.fn(async () => ({ progress: 42 }));
    const time = vi.fn(async () => ({ now: 1712059200000 }));
    const cli = createCli({
      systemApi: {
        version: async () => ({ version: "3.1.0" }),
        bootProgress,
        time
      }
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "boot-progress", "--json"]);
    await cli.parseAsync(["node", "sy", "system", "time", "--json"]);

    expect(bootProgress).toHaveBeenCalledTimes(1);
    expect(time).toHaveBeenCalledTimes(1);

    write.mockRestore();
  });

  it("uses an injected class instance for systemApi methods", async () => {
    class InstanceSystemApi {
      public calls = 0;

      async version() {
        this.calls += 1;
        return { version: "instance-3.2.0" };
      }

      async bootProgress() {
        return { progress: 11 };
      }

      async time() {
        return { now: 1712059200000 };
      }
    }

    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const systemApi = new InstanceSystemApi();
    const cli = createCli({ systemApi });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "version", "--json"]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.data).toEqual({ version: "instance-3.2.0" });
    expect(systemApi.calls).toBe(1);

    write.mockRestore();
  });

  it("preserves method receiver for injected systemApi methods", async () => {
    class ReceiverBoundSystemApi {
      constructor(private readonly prefix: string) {}

      async version() {
        return { version: `${this.prefix}-ok` };
      }

      async bootProgress() {
        return { progress: `${this.prefix}-progress` };
      }

      async time() {
        return { now: `${this.prefix}-time` };
      }
    }

    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cli = createCli({
      systemApi: new ReceiverBoundSystemApi("bound")
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "boot-progress", "--json"]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.data).toEqual({ progress: "bound-progress" });

    write.mockRestore();
  });

  it("writes structured failure output in --json mode", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const cli = createCli({
      systemApi: {
        version: async () => {
          throw new SiyuanCliError("API_NETWORK_ERROR", "network down", {
            endpoint: "/api/system/version"
          });
        },
        bootProgress: async () => ({ progress: 100 }),
        time: async () => ({ now: 1712059200000 })
      }
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "version", "--json"]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: false,
        command: "system.version",
        error: expect.objectContaining({
          code: "API_NETWORK_ERROR",
          message: "network down",
          details: { endpoint: "/api/system/version" }
        })
      })
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
    write.mockRestore();
  });

  it("does not return fake mock success by default for system version", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const priorToken = process.env.SIYUAN_TOKEN;
    delete process.env.SIYUAN_TOKEN;
    const cli = createCli();
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "version", "--json"]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("system.version");
    expect(payload.error.code).toBe("CONFIG_MISSING_TOKEN");
    expect(payload.data).toBeUndefined();

    if (priorToken === undefined) {
      delete process.env.SIYUAN_TOKEN;
    } else {
      process.env.SIYUAN_TOKEN = priorToken;
    }
    write.mockRestore();
  });

  it("rejects the removed root --token flag", async () => {
    const cli = createCli();
    cli.exitOverride();

    await expect(
      cli.parseAsync([
        "node",
        "sy",
        "--token",
        "flag-token",
        "system",
        "version",
        "--json"
      ])
    ).rejects.toMatchObject({ code: "commander.unknownOption" });
  });

  it("uses root --base-url with environment token for the default client path", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const priorToken = process.env.SIYUAN_TOKEN;
    const priorBaseUrl = process.env.SIYUAN_BASE_URL;
    process.env.SIYUAN_TOKEN = "env-token";
    delete process.env.SIYUAN_BASE_URL;
    const cli = createCli();
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "--base-url",
      "http://127.0.0.1:1",
      "system",
      "version",
      "--json"
    ]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("system.version");
    expect(payload.error.code).toBe("API_NETWORK_ERROR");

    if (priorToken === undefined) {
      delete process.env.SIYUAN_TOKEN;
    } else {
      process.env.SIYUAN_TOKEN = priorToken;
    }

    if (priorBaseUrl === undefined) {
      delete process.env.SIYUAN_BASE_URL;
    } else {
      process.env.SIYUAN_BASE_URL = priorBaseUrl;
    }
    write.mockRestore();
  });

  it("writes structured failure output for unexpected errors in --json mode", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const cli = createCli({
      systemApi: {
        version: async () => {
          throw new Error("boom");
        },
        bootProgress: async () => ({ progress: 100 }),
        time: async () => ({ now: 1712059200000 })
      }
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "version", "--json"]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("system.version");
    expect(payload.error.code).toBe("INTERNAL_ERROR");
    expect(payload.error.message).toBe("boom");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
    write.mockRestore();
  });

  it("uses CLI-path command id for boot-progress JSON output", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const cli = createCli({
      systemApi: {
        version: async () => ({ version: "3.1.0" }),
        bootProgress: async () => ({ progress: 42 }),
        time: async () => ({ now: 1712059200000 })
      }
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "system", "boot-progress", "--json"]);

    const output = write.mock.calls.map(([value]) => String(value)).join("");
    const payload = JSON.parse(output);
    expect(payload.command).toBe("system.boot-progress");

    write.mockRestore();
  });

  it("does not silently fall back to defaults for unsupported partial systemApi injection", async () => {
    const partialSystemApi = {
      version: async () => ({ version: "3.1.0" })
    };
    expect(() =>
      createCli({
        systemApi: partialSystemApi as unknown as import("../../src/commands/system.js").SystemApi
      })
    ).toThrow();
  });

  it("prints concise non-JSON entrypoint errors without stack traces", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/index.ts", "system", "version"],
      {
        cwd: process.cwd(),
        env: { ...process.env, SIYUAN_TOKEN: "" },
        encoding: "utf8"
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CONFIG_MISSING_TOKEN");
    expect(result.stderr).not.toMatch(/\n\s*at\s+/);
  });

  it("preserves root base-url when forwarding commands through repl", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/index.ts",
        "--base-url",
        "http://127.0.0.1:1",
        "repl"
      ],
      {
        cwd: process.cwd(),
        input: "system version --json\nexit\n",
        env: { ...process.env, SIYUAN_TOKEN: "env-token" },
        encoding: "utf8"
      }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"code":"API_NETWORK_ERROR"');
    expect(result.stdout).not.toContain('"code":"CONFIG_MISSING_TOKEN"');
  });
});
