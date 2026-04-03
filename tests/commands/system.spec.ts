import { describe, expect, it, vi } from "vitest";
import type { AxiosResponse } from "axios";
import {
  createHttpClient,
  formatFailure,
  formatSuccess,
  SiyuanClient,
  SiyuanCliError,
  resolveConfig
} from "../../src/core/index.js";

describe("core contracts", () => {
  it("resolves config with explicit values taking priority", () => {
    const result = resolveConfig({
      flags: {
        baseUrl: "http://127.0.0.1:6806",
        token: "flag-token",
        timeout: 5000
      },
      env: {
        SIYUAN_BASE_URL: "http://env.local:6806",
        SIYUAN_TOKEN: "env-token",
        SIYUAN_TIMEOUT: "15000"
      }
    });

    expect(result.baseUrl).toBe("http://127.0.0.1:6806");
    expect(result.token).toBe("flag-token");
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

  it("throws CONFIG_MISSING_TOKEN when token cannot be resolved", () => {
    expect(() => resolveConfig({ env: {} })).toThrowError(
      expect.objectContaining({ code: "CONFIG_MISSING_TOKEN" })
    );
  });

  it("throws CONFIG_MISSING_TOKEN for a blank token after trimming", () => {
    expect(() =>
      resolveConfig({
        flags: { token: "   " }
      })
    ).toThrowError(expect.objectContaining({ code: "CONFIG_MISSING_TOKEN" }));
  });

  it("throws CONFIG_INVALID_TIMEOUT for a non-positive timeout", () => {
    expect(() =>
      resolveConfig({
        flags: { token: "flag-token", timeout: 0 }
      })
    ).toThrowError(expect.objectContaining({ code: "CONFIG_INVALID_TIMEOUT" }));
  });

  it("throws CONFIG_INVALID_BASE_URL for a non-http(s) base URL", () => {
    expect(() =>
      resolveConfig({
        flags: { token: "flag-token", baseUrl: "ftp://localhost:6806" }
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
});
