import { Command } from "commander";
import {
  registerBlockCommands,
  type BlockApi,
  type BlockCommandDeps
} from "./commands/block.js";
import { registerDocCommands, type DocApi, type DocCommandDeps } from "./commands/doc.js";
import {
  registerNotebookCommands,
  type NotebookApi,
  type NotebookCommandDeps
} from "./commands/notebook.js";
import {
  registerAttrCommands as registerAttrCommandGroup,
  type AttrApi,
  type AttrCommandDeps
} from "./commands/attr.js";
import { registerSqlCommands, type SqlApi, type SqlCommandDeps } from "./commands/sql.js";
import {
  registerWorkflowCommands,
  type WorkflowApi,
  type WorkflowCommandDeps
} from "./commands/workflow.js";
import { createReplState, startRepl } from "./repl/repl.js";
import {
  registerSystemCommands,
  type SystemApi,
  type SystemCommandDeps
} from "./commands/system.js";
import {
  createHttpClient,
  resolveConfig,
  SiyuanClient,
  type SiyuanConfig,
  type SiyuanConfigFlags
} from "./core/index.js";

export interface CliDeps
  extends SystemCommandDeps,
    NotebookCommandDeps,
    SqlCommandDeps,
    DocCommandDeps,
    BlockCommandDeps,
    AttrCommandDeps,
    WorkflowCommandDeps {}

export interface CliDepsInput {
  systemApi?: SystemApi;
  notebookApi?: Partial<NotebookApi>;
  sqlApi?: SqlApi;
  docApi?: Partial<DocApi>;
  blockApi?: Partial<BlockApi>;
  attrApi?: Partial<AttrApi>;
  workflowApi?: Partial<WorkflowApi>;
  write?: (value: string) => boolean;
}

export function createCli(input: CliDepsInput = {}): Command {
  let currentConfigFlags: SiyuanConfigFlags = {};
  const program = new Command().name("sy").description("Agent-first CLI for SiYuan Note");

  program
    .option("--base-url <url>")
    .option("--timeout <ms>")
    .option("--profile <name>");

  program.hook("preAction", (_thisCommand, actionCommand) => {
    currentConfigFlags = extractConfigFlags(actionCommand.optsWithGlobals());
  });

  const deps = createDeps(input, () => currentConfigFlags);

  registerSystemCommands(program, deps);
  registerNotebookCommands(program, deps);
  registerDocCommands(program, deps);
  registerBlockCommands(program, deps);
  registerAttrCommandGroup(program, deps);
  registerSqlCommands(program, deps);
  registerWorkflowCommands(program, deps);

  program
    .command("repl")
    .description("Start an interactive SiYuan CLI shell")
    .action(async () => {
      const rootOptions = program.optsWithGlobals();
      const rootConfigFlags = extractConfigFlags(rootOptions);
      const initialProfile = rootConfigFlags.profile;

      await startRepl(
        async (argv) => {
          await createCli(input).parseAsync(
            prependGlobalFlags(argv, rootConfigFlags),
            {
              from: "user"
            }
          );
        },
        {
          state: createReplState({ profile: initialProfile }),
          resolveDocContext: async (doc) => {
            if (!doc.includes("/")) {
              return { id: doc };
            }

            return deps.workflowApi.resolvePath(doc);
          }
        }
      );
    });

  return program;
}

function createDeps(
  input: CliDepsInput,
  getConfigFlags: () => SiyuanConfigFlags = () => ({})
): CliDeps {
  const createClient = createClientFactory(getConfigFlags);
  const defaultNotebookApi = createDefaultNotebookApi(createClient);
  const defaultDocApi = createDefaultDocApi(createClient);
  const defaultBlockApi = createDefaultBlockApi(createClient);
  const defaultAttrApi = createDefaultAttrApi(createClient);
  const defaultWorkflowApi = createDefaultWorkflowApi(createClient);

  const systemApi = input.systemApi
    ? bindSystemApi(input.systemApi)
    : createDefaultSystemApi(createClient);
  const notebookApi = input.notebookApi
    ? bindNotebookApi(input.notebookApi, defaultNotebookApi)
    : defaultNotebookApi;
  const sqlApi = input.sqlApi ? bindSqlApi(input.sqlApi) : createDefaultSqlApi(createClient);
  const docApi = input.docApi ? bindDocApi(input.docApi, defaultDocApi) : defaultDocApi;
  const blockApi = input.blockApi
    ? bindBlockApi(input.blockApi, defaultBlockApi)
    : defaultBlockApi;
  const attrApi = input.attrApi
    ? bindAttrApi(input.attrApi, defaultAttrApi)
    : defaultAttrApi;
  const workflowApi = input.workflowApi
    ? bindWorkflowApi(input.workflowApi, defaultWorkflowApi)
    : defaultWorkflowApi;

  return {
    systemApi,
    notebookApi,
    docApi,
    blockApi,
    attrApi,
    sqlApi,
    workflowApi,
    write: input.write ?? ((value) => process.stdout.write(value))
  };
}

function createClientFactory(getConfigFlags: () => Partial<SiyuanConfig>) {
  return (): SiyuanClient => {
    const config = resolveConfig({
      flags: getConfigFlags(),
      env: process.env
    });
    const http = createHttpClient(config);
    return new SiyuanClient(http);
  };
}

function prependGlobalFlags(
  argv: string[],
  flags: SiyuanConfigFlags
): string[] {
  const next = [...argv];
  const prefix: string[] = [];

  pushMissingFlag(prefix, next, "--base-url", flags.baseUrl);
  pushMissingFlag(
    prefix,
    next,
    "--timeout",
    typeof flags.timeout === "number" ? String(flags.timeout) : undefined
  );
  pushMissingFlag(prefix, next, "--profile", flags.profile);

  return [...prefix, ...next];
}

function pushMissingFlag(
  prefix: string[],
  argv: string[],
  flag: "--base-url" | "--timeout" | "--profile",
  value?: string
): void {
  if (!value || argv.includes(flag)) {
    return;
  }

  prefix.push(flag, value);
}

function extractConfigFlags(options: Record<string, unknown>): SiyuanConfigFlags {
  return {
    baseUrl: asString(options.baseUrl),
    timeout: asNumber(options.timeout),
    profile: asString(options.profile)
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return undefined;
}

function createDefaultSystemApi(createClient: () => SiyuanClient): SystemApi {
  return {
    version: async () => createClient().version(),
    bootProgress: async () => createClient().bootProgress(),
    time: async () => createClient().time()
  };
}

function createDefaultNotebookApi(createClient: () => SiyuanClient): NotebookApi {
  return {
    list: async () => createClient().listNotebooks(),
    create: async (name: string) => createClient().createNotebook(name),
    open: async (notebook: string) => createClient().openNotebook(notebook),
    close: async (notebook: string) => createClient().closeNotebook(notebook)
  };
}

function createDefaultSqlApi(createClient: () => SiyuanClient): SqlApi {
  return {
    query: async (stmt: string) => createClient().querySql(stmt)
  };
}

function createDefaultDocApi(createClient: () => SiyuanClient): DocApi {
  return {
    create: async (input) => createClient().createDoc(input),
    exportMarkdown: async (id: string) => createClient().exportMarkdown(id),
    rename: async (id: string, title: string) => {
      await createClient().renameDoc(id, title);
      return { id, title };
    },
    move: async (fromIDs: string[], toID: string) => {
      await createClient().moveDocs(fromIDs, toID);
      return { fromIDs, toID };
    },
    remove: async (id: string, force?: boolean) => {
      await createClient().removeDoc(id, force);
      return { id, force: Boolean(force) };
    },
    resolvePath: async (path: string) => resolvePathByHPath(createClient, path)
  };
}

function createDefaultBlockApi(createClient: () => SiyuanClient): BlockApi {
  return {
    get: async (id: string) => createClient().getBlockKramdown(id),
    children: async (id: string) => createClient().getChildBlocks(id),
    append: async (input) => createClient().appendBlock(input),
    prepend: async (input) => createClient().prependBlock(input),
    insertBefore: async (input) =>
      createClient().insertBlock({
        nextID: input.nextID,
        data: input.data,
        dataType: input.dataType
      }),
    insertAfter: async (input) =>
      createClient().insertBlock({
        previousID: input.previousID,
        data: input.data,
        dataType: input.dataType
      }),
    update: async (input) => createClient().updateBlock(input),
    remove: async (id: string) => {
      await createClient().deleteBlock(id);
      return { id, removed: true };
    }
  };
}

function createDefaultAttrApi(createClient: () => SiyuanClient): AttrApi {
  return {
    get: async (id: string) => createClient().getBlockAttrs(id),
    set: async (id: string, attrs: Record<string, string>) =>
      createClient().setBlockAttrs(id, attrs)
  };
}

function createDefaultWorkflowApi(createClient: () => SiyuanClient): WorkflowApi {
  return {
    resolvePath: async (path: string) => resolvePathByHPath(createClient, path),
    createDoc: async (input) => {
      const result = await createClient().createDoc({
        ...input,
        markdown: input.markdown ?? ""
      });
      return normalizeIdResult(result, "workflow.doc-upsert");
    },
    appendBlock: async (input) => createClient().appendBlock(input),
    updateBlock: async (input) => createClient().updateBlock(input),
    query: async (stmt: string) => {
      const result = await createClient().querySql(stmt);
      return Array.isArray(result) ? result : [];
    }
  };
}

function bindSystemApi(systemApi: SystemApi): SystemApi {
  return {
    version: systemApi.version.bind(systemApi),
    bootProgress: systemApi.bootProgress.bind(systemApi),
    time: systemApi.time.bind(systemApi)
  };
}

function bindNotebookApi(
  notebookApi: Partial<NotebookApi>,
  fallback: NotebookApi
): NotebookApi {
  return {
    list: notebookApi.list?.bind(notebookApi) ?? fallback.list,
    create: notebookApi.create?.bind(notebookApi) ?? fallback.create,
    open: notebookApi.open?.bind(notebookApi) ?? fallback.open,
    close: notebookApi.close?.bind(notebookApi) ?? fallback.close
  };
}

function bindSqlApi(sqlApi: SqlApi): SqlApi {
  return {
    query: sqlApi.query.bind(sqlApi)
  };
}

function bindDocApi(docApi: Partial<DocApi>, fallback: DocApi): DocApi {
  return {
    create: docApi.create?.bind(docApi) ?? fallback.create,
    exportMarkdown: docApi.exportMarkdown?.bind(docApi) ?? fallback.exportMarkdown,
    rename: docApi.rename?.bind(docApi) ?? fallback.rename,
    move: docApi.move?.bind(docApi) ?? fallback.move,
    remove: docApi.remove?.bind(docApi) ?? fallback.remove,
    resolvePath: docApi.resolvePath?.bind(docApi) ?? fallback.resolvePath
  };
}

function bindBlockApi(blockApi: Partial<BlockApi>, fallback: BlockApi): BlockApi {
  return {
    get: blockApi.get?.bind(blockApi) ?? fallback.get,
    children: blockApi.children?.bind(blockApi) ?? fallback.children,
    append: blockApi.append?.bind(blockApi) ?? fallback.append,
    prepend: blockApi.prepend?.bind(blockApi) ?? fallback.prepend,
    insertBefore: blockApi.insertBefore?.bind(blockApi) ?? fallback.insertBefore,
    insertAfter: blockApi.insertAfter?.bind(blockApi) ?? fallback.insertAfter,
    update: blockApi.update?.bind(blockApi) ?? fallback.update,
    remove: blockApi.remove?.bind(blockApi) ?? fallback.remove
  };
}

function bindAttrApi(attrApi: Partial<AttrApi>, fallback: AttrApi): AttrApi {
  return {
    get: attrApi.get?.bind(attrApi) ?? fallback.get,
    set: attrApi.set?.bind(attrApi) ?? fallback.set
  };
}

function bindWorkflowApi(
  workflowApi: Partial<WorkflowApi>,
  fallback: WorkflowApi
): WorkflowApi {
  return {
    resolvePath: workflowApi.resolvePath?.bind(workflowApi) ?? fallback.resolvePath,
    createDoc: workflowApi.createDoc?.bind(workflowApi) ?? fallback.createDoc,
    appendBlock: workflowApi.appendBlock?.bind(workflowApi) ?? fallback.appendBlock,
    updateBlock: workflowApi.updateBlock?.bind(workflowApi) ?? fallback.updateBlock,
    query: workflowApi.query?.bind(workflowApi) ?? fallback.query
  };
}

async function resolvePathByHPath(
  createClient: () => SiyuanClient,
  path: string
): Promise<{ id: string } | null> {
  for (const candidate of candidateHPaths(path)) {
    const stmt =
      "SELECT id FROM blocks " +
      `WHERE type = 'd' AND hpath = ${quoteSqlString(candidate)} ` +
      "ORDER BY updated DESC LIMIT 1";
    const rows = await createClient().querySql(stmt);

    if (!Array.isArray(rows)) {
      continue;
    }

    const firstRow = rows[0];
    if (
      firstRow &&
      typeof firstRow === "object" &&
      "id" in firstRow &&
      typeof firstRow.id === "string"
    ) {
      return { id: firstRow.id };
    }
  }

  return null;
}

function candidateHPaths(path: string): string[] {
  const candidates = [path];
  const stripped = stripNotebookPrefix(path);
  if (stripped && stripped !== path) {
    candidates.push(stripped);
  }
  return candidates;
}

function stripNotebookPrefix(path: string): string | null {
  if (!path.startsWith("/")) {
    return null;
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length < 3) {
    return null;
  }

  return `/${segments.slice(1).join("/")}`;
}

function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function normalizeIdResult(value: unknown, command: string): { id: string } {
  if (typeof value === "string") {
    return { id: value };
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return { id: value.id };
  }

  throw new Error(`${command} returned a result without an id`);
}
