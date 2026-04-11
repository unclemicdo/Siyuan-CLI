import { afterEach, describe, expect, it, vi } from "vitest";
import type { AxiosResponse } from "axios";
import { createCli } from "../../src/cli.js";
import { SiyuanClient } from "../../src/core/client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tag commands", () => {
  it("lists, renames, removes, and sets native doc tags", async () => {
    const write = vi.fn(() => true);
    const list = vi.fn(async (input: {
      sort?: number;
      app: string;
      ignoreMaxListHint: boolean;
    }) => [{ label: "AI", count: 2, input }]);
    const rename = vi.fn(async (oldLabel: string, newLabel: string) => ({
      oldLabel,
      newLabel
    }));
    const remove = vi.fn(async (label: string) => ({ label }));
    const setDocTags = vi.fn(async (id: string, tags: string) => ({ id, tags }));

    const cli = createCli({
      tagApi: { list, rename, remove, setDocTags },
      write
    });
    cli.exitOverride();

    await cli.parseAsync(["node", "sy", "tag", "list", "--sort", "4", "--json"]);
    await cli.parseAsync([
      "node",
      "sy",
      "tag",
      "rename",
      "--old-label",
      "旧标签",
      "--new-label",
      "新标签",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "tag",
      "remove",
      "--label",
      "废弃标签",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "tag",
      "set-doc",
      "--id",
      "doc-1",
      "--tags",
      "AI, PDCA，知识管理",
      "--tag",
      "#思源笔记",
      "--json"
    ]);

    expect(list).toHaveBeenCalledWith({
      sort: 4,
      app: "sy-cli",
      ignoreMaxListHint: true
    });
    expect(rename).toHaveBeenCalledWith("旧标签", "新标签");
    expect(remove).toHaveBeenCalledWith("废弃标签");
    expect(setDocTags).toHaveBeenCalledWith(
      "doc-1",
      "AI,PDCA,知识管理,思源笔记"
    );
  });

  it("clears native doc tags", async () => {
    const write = vi.fn(() => true);
    const setDocTags = vi.fn(async (id: string, tags: string) => ({ id, tags }));

    const cli = createCli({
      tagApi: {
        list: async () => [],
        rename: async () => ({}),
        remove: async () => ({}),
        setDocTags
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "tag",
      "set-doc",
      "--id",
      "doc-2",
      "--clear",
      "--json"
    ]);

    expect(setDocTags).toHaveBeenCalledWith("doc-2", "");
  });
});

describe("ref commands", () => {
  it("queries and manages backlinks through injected ref api methods", async () => {
    const write = vi.fn(() => true);
    const refresh = vi.fn(async (id: string) => ({ id }));
    const backlinks = vi.fn(async (input: {
      id: string;
      k: string;
      mk: string;
      beforeLen: number;
      containChildren?: boolean;
    }) => ({ input }));
    const docBacklinks = vi.fn(async (input: {
      defID: string;
      refTreeID: string;
      keyword: string;
      containChildren?: boolean;
      highlight?: boolean;
    }) => ({ input }));
    const docBackmentions = vi.fn(async (input: {
      defID: string;
      refTreeID: string;
      keyword: string;
      containChildren?: boolean;
      highlight?: boolean;
    }) => ({ input }));
    const transfer = vi.fn(async (input: {
      fromID: string;
      toID: string;
      refIDs?: string[];
    }) => input);

    const cli = createCli({
      refApi: {
        refresh,
        backlinks,
        docBacklinks,
        docBackmentions,
        transfer
      },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "ref",
      "refresh",
      "--id",
      "block-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "ref",
      "backlinks",
      "--id",
      "block-1",
      "--keyword",
      "协作",
      "--mention-keyword",
      "agent",
      "--before-len",
      "24",
      "--contain-children",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "ref",
      "doc-backlinks",
      "--def-id",
      "doc-a",
      "--ref-tree-id",
      "doc-b",
      "--keyword",
      "调研",
      "--contain-children",
      "--no-highlight",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "ref",
      "doc-backmentions",
      "--def-id",
      "doc-a",
      "--ref-tree-id",
      "doc-b",
      "--keyword",
      "知识",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "ref",
      "transfer",
      "--from-id",
      "from-1",
      "--to-id",
      "to-1",
      "--ref-id",
      "r1",
      "r2",
      "--json"
    ]);

    expect(refresh).toHaveBeenCalledWith("block-1");
    expect(backlinks).toHaveBeenCalledWith({
      id: "block-1",
      k: "协作",
      mk: "agent",
      beforeLen: 24,
      containChildren: true
    });
    expect(docBacklinks).toHaveBeenCalledWith({
      defID: "doc-a",
      refTreeID: "doc-b",
      keyword: "调研",
      containChildren: true,
      highlight: false
    });
    expect(docBackmentions).toHaveBeenCalledWith({
      defID: "doc-a",
      refTreeID: "doc-b",
      keyword: "知识",
      highlight: true
    });
    expect(transfer).toHaveBeenCalledWith({
      fromID: "from-1",
      toID: "to-1",
      refIDs: ["r1", "r2"]
    });
  });
});

describe("graph commands", () => {
  it("queries global and local graph plus reset operations", async () => {
    const write = vi.fn(() => true);
    const global = vi.fn(async (input: {
      k: string;
      conf: Record<string, unknown>;
      reqId: string;
    }) => ({ scope: "global", input }));
    const local = vi.fn(async (input: {
      id: string;
      k: string;
      conf: Record<string, unknown>;
      reqId: string;
    }) => ({ scope: "local", input }));
    const resetGlobal = vi.fn(async () => ({ scope: "global" }));
    const resetLocal = vi.fn(async () => ({ scope: "local" }));

    const cli = createCli({
      graphApi: { global, local, resetGlobal, resetLocal },
      write
    });
    cli.exitOverride();

    await cli.parseAsync([
      "node",
      "sy",
      "graph",
      "global",
      "--query",
      "AI",
      "--conf",
      "{\"depth\":2}",
      "--req-id",
      "req-1",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "graph",
      "local",
      "--id",
      "doc-1",
      "--query",
      "PDCA",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "graph",
      "reset",
      "--scope",
      "global",
      "--json"
    ]);
    await cli.parseAsync([
      "node",
      "sy",
      "graph",
      "reset",
      "--scope",
      "local",
      "--json"
    ]);

    expect(global).toHaveBeenCalledWith({
      k: "AI",
      conf: { depth: 2 },
      reqId: "req-1"
    });
    expect(local).toHaveBeenCalledWith({
      id: "doc-1",
      k: "PDCA",
      conf: {},
      reqId: "sy-cli"
    });
    expect(resetGlobal).toHaveBeenCalledTimes(1);
    expect(resetLocal).toHaveBeenCalledTimes(1);
  });
});

describe("siyuan client knowledge operations", () => {
  it("posts native tag, backlink, and graph payloads to official endpoints", async () => {
    const post = vi.fn(async (_endpoint: string, _body: unknown) => {
      const response: AxiosResponse<{
        code: number;
        msg: string;
        data: { ok: boolean };
      }> = {
        data: {
          code: 0,
          msg: "ok",
          data: { ok: true }
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} }
      };
      return response;
    });
    const client = new SiyuanClient({ post } as never);

    await client.setDocTags("doc-1", "AI,知识管理");
    await client.getTags({ app: "sy-cli", ignoreMaxListHint: true });
    await client.getBacklink({
      id: "block-1",
      k: "",
      mk: "",
      beforeLen: 12
    });
    await client.getGraph({
      k: "AI",
      conf: {},
      reqId: "req-graph"
    });

    expect(post).toHaveBeenNthCalledWith(1, "/api/attr/setBlockAttrs", {
      id: "doc-1",
      attrs: { tags: "AI,知识管理" }
    });
    expect(post).toHaveBeenNthCalledWith(2, "/api/tag/getTag", {
      app: "sy-cli",
      ignoreMaxListHint: true
    });
    expect(post).toHaveBeenNthCalledWith(3, "/api/ref/getBacklink", {
      id: "block-1",
      k: "",
      mk: "",
      beforeLen: 12
    });
    expect(post).toHaveBeenNthCalledWith(4, "/api/graph/getGraph", {
      k: "AI",
      conf: {},
      reqId: "req-graph"
    });
  });
});
