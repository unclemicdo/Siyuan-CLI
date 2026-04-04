import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const hasLiveSiyuanEnv = Boolean(
  process.env.SIYUAN_BASE_URL && process.env.SIYUAN_TOKEN
);

const runCli = (...args: string[]) =>
  spawnSync(process.execPath, ["--import", "tsx", "src/index.ts", ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });

const parseJsonPayload = (stdout: string) =>
  JSON.parse(stdout) as {
    ok: boolean;
    command: string;
    data?: unknown;
  };

describe("full e2e", () => {
  it("exposes a stable live-environment gate", () => {
    expect(typeof hasLiveSiyuanEnv).toBe("boolean");
  });

  it.skipIf(!hasLiveSiyuanEnv)(
    "runs a live system version smoke",
    () => {
      const result = runCli("system", "version", "--json");

      expect(result.status).toBe(0);
      const payload = parseJsonPayload(result.stdout) as {
        ok: boolean;
        command: string;
        data?: unknown;
      };

      expect(payload.ok).toBe(true);
      expect(payload.command).toBe("system.version");
      expect(typeof payload.data).toBe("string");
    }
  );

  it.skipIf(!hasLiveSiyuanEnv)("runs a live notebook list smoke", () => {
    const result = runCli("notebook", "list", "--json");

    expect(result.status).toBe(0);
    const payload = parseJsonPayload(result.stdout);

    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("notebook.list");
    expect(payload.data).toBeDefined();
  });

  it.skipIf(hasLiveSiyuanEnv)(
    "skips live checks cleanly when Siyuan env vars are absent",
    () => {
      expect(hasLiveSiyuanEnv).toBe(false);
      expect(process.env.SIYUAN_BASE_URL && process.env.SIYUAN_TOKEN).toBeFalsy();
    }
  );
});
