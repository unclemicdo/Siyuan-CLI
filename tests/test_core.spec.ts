import { describe, expect, it } from "vitest";

describe("bootstrap", () => {
  it("exposes a CLI factory function", async () => {
    const mod = await import("../src/cli.js");
    expect(typeof mod.createCli).toBe("function");
  });
});
