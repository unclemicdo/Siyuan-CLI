import { afterEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../../src/cli.js";
import type { AvApi } from "../../src/commands/av.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function createAvCli(avApi: AvApi, write = vi.fn(() => true)) {
  const cli = createCli({
    avApi,
    write
  });
  cli.exitOverride();
  return { cli, write };
}

describe("av commands", () => {
  it("registers av read commands through injected av api methods", async () => {
    const write = vi.fn(() => true);
    const get = vi.fn(async (id: string) => ({ id }));
    const render = vi.fn(async (input) => ({ input }));
    const keys = vi.fn(async (id: string) => ({ id, keys: [] }));
    const primaryValues = vi.fn(async (id: string) => ({ id, rows: [] }));
    const search = vi.fn(async (input) => ({ input, matches: [] }));
    const relationKeys = vi.fn(async (id: string) => ({ id, relationKeys: [] }));
    const filterSort = vi.fn(async (input) => ({ input }));
    const views = vi.fn(async (id: string) => ({ id, views: [] }));

    const { cli } = createAvCli(
      {
        get,
        render,
        keys,
        primaryValues,
        search,
        relationKeys,
        filterSort,
        views
      },
      write
    );

    await cli.parseAsync(["node", "sy", "av", "get", "--id", "av-1", "--json"]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "render",
      "--id",
      "av-1",
      "--view-id",
      "view-1",
      "--block-id",
      "block-1",
      "--query",
      "roadmap",
      "--page",
      "2",
      "--page-size",
      "50",
      "--group-paging",
      "{\"status\":{\"page\":3}}",
      "--config",
      "{\"dense\":true}",
      "--create-if-not-exist",
      "--json"
    ]);
    await cli.parseAsync(["node", "sy", "av", "keys", "--id", "av-1", "--json"]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "primary-values",
      "--id",
      "av-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "search",
      "--id",
      "av-1",
      "--query",
      "agent",
      "--page",
      "4",
      "--page-size",
      "25",
      "--group-paging",
      "{\"owner\":{\"page\":2}}",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "relation-keys",
      "--id",
      "av-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "filter-sort",
      "--id",
      "av-1",
      "--view-id",
      "view-1",
      "--json"
    ]);
    await cli.parseAsync(["node", "sy", "av", "views", "--id", "av-1", "--json"]);

    expect(get).toHaveBeenCalledWith("av-1");
    expect(render).toHaveBeenCalledWith({
      id: "av-1",
      viewID: "view-1",
      blockID: "block-1",
      query: "roadmap",
      page: 2,
      pageSize: 50,
      groupPaging: { status: { page: 3 } },
      config: { dense: true },
      createIfNotExist: true
    });
    expect(keys).toHaveBeenCalledWith("av-1");
    expect(primaryValues).toHaveBeenCalledWith("av-1");
    expect(search).toHaveBeenCalledWith({
      id: "av-1",
      query: "agent",
      page: 4,
      pageSize: 25,
      groupPaging: { owner: { page: 2 } }
    });
    expect(relationKeys).toHaveBeenCalledWith("av-1");
    expect(filterSort).toHaveBeenCalledWith({
      id: "av-1",
      viewID: "view-1"
    });
    expect(views).toHaveBeenCalledWith("av-1");
  });

  it("routes av mutation commands through injected av api methods", async () => {
    const write = vi.fn(() => true);
    const setCell = vi.fn(async (input) => ({ input }));
    const addKey = vi.fn(async (input) => ({ input }));
    const updateKey = vi.fn(async (input) => ({ input }));
    const removeKey = vi.fn(async (input) => ({ input }));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell,
        addKey,
        updateKey,
        removeKey
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "set-cell",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--item-id",
      "row-1",
      "--value",
      "{\"label\":\"Alpha\"}",
      "--value-type",
      "text",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "add-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-2",
      "--name",
      "Status",
      "--type",
      "select",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "update-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-2",
      "--name",
      "Lifecycle",
      "--type",
      "relation",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "remove-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-3",
      "--force",
      "--json"
    ]);

    expect(setCell).toHaveBeenCalledWith({
      avID: "av-1",
      keyID: "key-1",
      itemID: "row-1",
      value: { text: { content: "{\"label\":\"Alpha\"}" } },
      valueType: "text"
    });
    expect(addKey).toHaveBeenCalledWith({
      avID: "av-1",
      keyID: "key-2",
      keyName: "Status",
      keyType: "select",
      keyIcon: "",
      previousKeyID: ""
    });
    expect(updateKey).toHaveBeenCalledWith({
      avID: "av-1",
      keyID: "key-2",
      keyName: "Lifecycle",
      keyType: "relation",
      keyIcon: undefined
    });
    expect(removeKey).toHaveBeenCalledWith({
      avID: "av-1",
      keyID: "key-3",
      removeRelationDest: undefined
    });
  });

  it("parses av set-cell values deterministically from raw text and json-like input", async () => {
    const write = vi.fn(() => true);
    const setCell = vi.fn(async (input) => ({ input }));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell,
        addKey: async () => ({}),
        updateKey: async () => ({}),
        removeKey: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "set-cell",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--item-id",
      "row-1",
      "--value",
      "hello",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "set-cell",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--item-id",
      "row-2",
      "--value",
      "true",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "set-cell",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--item-id",
      "row-3",
      "--value",
      "[1,2,3]",
      "--json"
    ]);

    expect(setCell).toHaveBeenNthCalledWith(1, {
      avID: "av-1",
      keyID: "key-1",
      itemID: "row-1",
      value: { text: { content: "hello" } },
      valueType: undefined
    });
    expect(setCell).toHaveBeenNthCalledWith(2, {
      avID: "av-1",
      keyID: "key-1",
      itemID: "row-2",
      value: true,
      valueType: undefined
    });
    expect(setCell).toHaveBeenNthCalledWith(3, {
      avID: "av-1",
      keyID: "key-1",
      itemID: "row-3",
      value: [1, 2, 3],
      valueType: undefined
    });
  });

  it("omits optional render and filter-sort fields when flags are not provided", async () => {
    const write = vi.fn(() => true);
    const render = vi.fn(async (input) => ({ input }));
    const filterSort = vi.fn(async (input) => ({ input }));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render,
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort,
        views: async () => ({})
      },
      write
    );

    await cli.parseAsync(["node", "sy", "av", "render", "--id", "av-1", "--json"]);
    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "filter-sort",
      "--id",
      "av-1",
      "--json"
    ]);

    expect(render).toHaveBeenCalledWith({
      id: "av-1",
      viewID: undefined,
      blockID: undefined,
      query: undefined,
      page: undefined,
      pageSize: undefined,
      groupPaging: undefined,
      config: undefined,
      createIfNotExist: undefined
    });
    expect(filterSort).toHaveBeenCalledWith({
      id: "av-1",
      viewID: undefined
    });
  });

  it("returns structured validation errors for invalid av json options", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const render = vi.fn(async () => ({}));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render,
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "render",
      "--id",
      "av-1",
      "--group-paging",
      "[]",
      "--json"
    ]);

    expect(render).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("av.render");
    expect(payload.error.code).toBe("VALIDATION_INVALID_JSON");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("returns structured validation errors for invalid av numeric options", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const search = vi.fn(async () => ({}));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search,
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "search",
      "--id",
      "av-1",
      "--query",
      "agent",
      "--page",
      "NaN",
      "--json"
    ]);

    expect(search).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("av.search");
    expect(payload.error.code).toBe("VALIDATION_INVALID_NUMBER");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("requires --force for av remove-key and does not call api without it", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const removeKey = vi.fn(async () => ({}));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell: async () => ({}),
        addKey: async () => ({}),
        updateKey: async () => ({}),
        removeKey
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "remove-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--json"
    ]);

    expect(removeKey).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("av.remove-key");
    expect(payload.error.code).toBe("VALIDATION_FORCE_REQUIRED");
    expect(payload.error.message).toBe("--force is required to remove an av key");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("rejects av update-key when neither --name nor --type is provided", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const updateKey = vi.fn(async () => ({}));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell: async () => ({}),
        addKey: async () => ({}),
        updateKey,
        removeKey: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "update-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--json"
    ]);

    expect(updateKey).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("av.update-key");
    expect(payload.error.code).toBe("VALIDATION_MISSING_MUTATION");
    expect(payload.error.message).toBe("at least one mutation option must be provided");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("resolves the missing name or type from av keys when updating one field", async () => {
    const write = vi.fn(() => true);
    const keys = vi.fn(async () => [
      { id: "key-1", name: "Status", type: "select" }
    ]);
    const updateKey = vi.fn(async (input) => ({ input }));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys,
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell: async () => ({}),
        addKey: async () => ({}),
        updateKey,
        removeKey: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "update-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--name",
      "Lifecycle",
      "--json"
    ]);

    expect(keys).toHaveBeenCalledWith("av-1");
    expect(updateKey).toHaveBeenCalledWith({
      avID: "av-1",
      keyID: "key-1",
      keyName: "Lifecycle",
      keyType: "select",
      keyIcon: undefined
    });
  });

  it("fails update-key with a structured error when the current key cannot be resolved", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const updateKey = vi.fn(async () => ({}));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => [],
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell: async () => ({}),
        addKey: async () => ({}),
        updateKey,
        removeKey: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "update-key",
      "--av-id",
      "av-1",
      "--key-id",
      "missing",
      "--name",
      "Lifecycle",
      "--json"
    ]);

    expect(updateKey).not.toHaveBeenCalled();
    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("av.update-key");
    expect(payload.error.code).toBe("API_RESPONSE_ERROR");
    expect(payload.error.message).toBe(
      "unable to resolve current name/type for av key [missing] in av [av-1]"
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });

  it("updates only the icon without resolving key values", async () => {
    const write = vi.fn(() => true);
    const keys = vi.fn(async () => []);
    const updateKey = vi.fn(async (input) => ({ input }));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys,
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell: async () => ({}),
        addKey: async () => ({}),
        updateKey,
        removeKey: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "update-key",
      "--av-id",
      "av-1",
      "--key-id",
      "key-1",
      "--icon",
      "iconTag",
      "--json"
    ]);

    expect(keys).not.toHaveBeenCalled();
    expect(updateKey).toHaveBeenCalledWith({
      avID: "av-1",
      keyID: "key-1",
      keyName: undefined,
      keyType: undefined,
      keyIcon: "iconTag"
    });
  });

  it("routes av add-detached-rows with itemID and content", async () => {
    const write = vi.fn(() => true);
    const addDetachedRows = vi.fn(async (input) => ({ input }));

    const { cli } = createAvCli(
      {
        get: async () => ({}),
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({}),
        setCell: async () => ({}),
        addKey: async () => ({}),
        updateKey: async () => ({}),
        removeKey: async () => ({}),
        addBlocks: async () => ({}),
        removeBlocks: async () => ({}),
        addDetachedRows,
        setName: async () => ({})
      },
      write
    );

    await cli.parseAsync([
      "node",
      "sy",
      "av",
      "add-detached-rows",
      "--av-id",
      "av-1",
      "--row-ids",
      "row-1,row-2",
      "--content",
      "新建行",
      "--json"
    ]);

    expect(addDetachedRows).toHaveBeenCalledWith({
      avID: "av-1",
      srcs: [
        { itemID: "row-1", isDetached: true, content: "新建行" },
        { itemID: "row-2", isDetached: true, content: "新建行" }
      ]
    });
  });

  it("writes json success payloads for av read commands", async () => {
    const write = vi.fn(() => true);
    const { cli } = createAvCli(
      {
        get: async () => ({ id: "av-1", name: "Projects" }),
        render: async () => ({ rows: [{ id: "row-1" }] }),
        keys: async () => [{ id: "k1" }],
        primaryValues: async () => ({ values: ["Alpha"] }),
        search: async () => ({ matches: [{ id: "row-1" }] }),
        relationKeys: async () => ({ keys: [{ id: "rel-1" }] }),
        filterSort: async () => ({ filters: [], sorts: [] }),
        views: async () => [{ id: "view-1" }]
      },
      write
    );

    await cli.parseAsync(["node", "sy", "av", "keys", "--id", "av-1", "--json"]);
    await cli.parseAsync(["node", "sy", "av", "views", "--id", "av-1", "--json"]);

    const keysPayload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    const viewsPayload = JSON.parse(String(write.mock.calls[1]?.[0] ?? ""));
    expect(keysPayload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "av.keys",
        data: [{ id: "k1" }]
      })
    );
    expect(viewsPayload).toEqual(
      expect.objectContaining({
        ok: true,
        command: "av.views",
        data: [{ id: "view-1" }]
      })
    );
  });

  it("writes structured failure output for unexpected av errors in --json mode", async () => {
    const write = vi.fn(() => true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const { cli } = createAvCli(
      {
        get: async () => {
          throw new Error("boom");
        },
        render: async () => ({}),
        keys: async () => ({}),
        primaryValues: async () => ({}),
        search: async () => ({}),
        relationKeys: async () => ({}),
        filterSort: async () => ({}),
        views: async () => ({})
      },
      write
    );

    await cli.parseAsync(["node", "sy", "av", "get", "--id", "av-1", "--json"]);

    const payload = JSON.parse(String(write.mock.calls[0]?.[0] ?? ""));
    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("av.get");
    expect(payload.error.code).toBe("INTERNAL_ERROR");
    expect(payload.error.message).toBe("boom");
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
  });
});
