import { describe, expect, it } from "vitest";

const hasLiveSiyuanEnv = Boolean(
  process.env.SIYUAN_BASE_URL && process.env.SIYUAN_TOKEN
);

describe("full e2e", () => {
  it("exposes a stable live-environment gate", () => {
    expect(typeof hasLiveSiyuanEnv).toBe("boolean");
  });

  it.skipIf(!hasLiveSiyuanEnv)(
    "requires live Siyuan environment variables before running live checks",
    () => {
      expect(process.env.SIYUAN_BASE_URL).toBeDefined();
      expect(process.env.SIYUAN_TOKEN).toBeDefined();
    }
  );

  it.skipIf(hasLiveSiyuanEnv)(
    "skips live checks cleanly when Siyuan env vars are absent",
    () => {
      expect(hasLiveSiyuanEnv).toBe(false);
    }
  );
});
