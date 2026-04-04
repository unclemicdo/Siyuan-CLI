import { describe, expect, it, vi } from "vitest";
import { createCli } from "../../src/cli.js";
import { assertReadOnlySql } from "../../src/services/sql-safety.js";

describe("sql safety", () => {
  it("accepts select queries", () => {
    expect(assertReadOnlySql(" SELECT * FROM blocks LIMIT 1; ")).toBe(
      "SELECT * FROM blocks LIMIT 1"
    );
  });

  it("rejects mutation queries", () => {
    expect(() => assertReadOnlySql("DELETE FROM blocks")).toThrowError(
      expect.objectContaining({ code: "SQL_UNSAFE" })
    );
  });
});

describe("notebook list", () => {
  it("returns notebook data in JSON mode", async () => {
    const write = vi.fn(() => true);
    const list = vi.fn(async () => ({
      notebooks: [{ id: "n1", name: "Work", closed: false }]
    }));

    const cli = createCli({
      notebookApi: { list },
      write
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "notebook", "list", "--json"]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("notebook.list");
    expect(payload.data).toEqual({
      notebooks: [{ id: "n1", name: "Work", closed: false }]
    });
  });
});

describe("sql query", () => {
  it("queries through sqlApi and emits json payload", async () => {
    const write = vi.fn(() => true);
    const query = vi.fn(async (stmt: string) => [{ id: "b1", stmt }]);

    const cli = createCli({
      sqlApi: { query },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "sql",
      "query",
      "--stmt",
      "SELECT id FROM blocks LIMIT 1",
      "--json"
    ]);

    expect(query).toHaveBeenCalledWith("SELECT id FROM blocks LIMIT 1");
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("sql.query");
    expect(payload.data).toEqual([
      { id: "b1", stmt: "SELECT id FROM blocks LIMIT 1" }
    ]);
  });

  it("returns structured sql safety error in json mode", async () => {
    const write = vi.fn(() => true);
    const query = vi.fn(async () => []);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const cli = createCli({
      sqlApi: { query },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "sql",
      "query",
      "--stmt",
      "DELETE FROM blocks",
      "--json"
    ]);

    expect(query).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("sql.query");
    expect(payload.error.code).toBe("SQL_UNSAFE");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("explains accepted read-only SQL without calling sqlApi", async () => {
    const write = vi.fn(() => true);
    const query = vi.fn(async () => []);
    const cli = createCli({
      sqlApi: { query },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "sql",
      "explain-safety",
      "--stmt",
      " SELECT id FROM blocks LIMIT 1; ",
      "--json"
    ]);

    expect(query).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "sql.explain-safety",
        data: {
          accepted: true,
          readOnly: true,
          normalizedStmt: "SELECT id FROM blocks LIMIT 1"
        }
      })
    );
  });

  it("returns a structured unsafe explanation error in json mode", async () => {
    const write = vi.fn(() => true);
    const cli = createCli({
      sqlApi: { query: async () => [] },
      write
    });
    cli.exitOverride();
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    await cli.parseAsync([
      "node",
      "sy",
      "sql",
      "explain-safety",
      "--stmt",
      "DELETE FROM blocks",
      "--json"
    ]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("sql.explain-safety");
    expect(payload.error.code).toBe("SQL_UNSAFE");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});
