import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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
import {
  registerTagCommands,
  type TagApi,
  type TagCommandDeps
} from "./commands/tag.js";
import {
  registerRefCommands,
  type RefApi,
  type RefCommandDeps
} from "./commands/ref.js";
import {
  registerGraphCommands,
  type GraphApi,
  type GraphCommandDeps
} from "./commands/graph.js";
import {
  registerAvCommands,
  type AvApi,
  type AvCommandDeps
} from "./commands/av.js";
import {
  registerTemplateCommands,
  type TemplateApi,
  type TemplateCommandDeps
} from "./commands/template.js";
import {
  registerFileCommands,
  type FileApi,
  type FileCommandDeps
} from "./commands/file.js";
import {
  registerAssetCommands,
  type AssetApi,
  type AssetCommandDeps
} from "./commands/asset.js";
import {
  registerPathCommands,
  type PathApi,
  type PathCommandDeps
} from "./commands/path.js";
import {
  registerExportCommands,
  type ExportApi,
  type ExportCommandDeps
} from "./commands/export.js";
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
import { SiyuanCliError } from "./core/errors.js";

export interface CliDeps
  extends SystemCommandDeps,
    NotebookCommandDeps,
    SqlCommandDeps,
    DocCommandDeps,
    BlockCommandDeps,
    AttrCommandDeps,
    WorkflowCommandDeps,
    TagCommandDeps,
    RefCommandDeps,
    GraphCommandDeps,
    AvCommandDeps,
    TemplateCommandDeps,
    FileCommandDeps,
    AssetCommandDeps,
    PathCommandDeps,
    ExportCommandDeps {}

export interface CliDepsInput {
  systemApi?: SystemApi;
  notebookApi?: Partial<NotebookApi>;
  sqlApi?: SqlApi;
  docApi?: Partial<DocApi>;
  blockApi?: Partial<BlockApi>;
  attrApi?: Partial<AttrApi>;
  workflowApi?: Partial<WorkflowApi>;
  tagApi?: Partial<TagApi>;
  refApi?: Partial<RefApi>;
  graphApi?: Partial<GraphApi>;
  avApi?: Partial<AvApi>;
  templateApi?: Partial<TemplateApi>;
  fileApi?: Partial<FileApi>;
  assetApi?: Partial<AssetApi>;
  pathApi?: Partial<PathApi>;
  exportApi?: Partial<ExportApi>;
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
  registerTagCommands(program, deps);
  registerRefCommands(program, deps);
  registerGraphCommands(program, deps);
  registerAvCommands(program, deps);
  registerTemplateCommands(program, deps);
  registerFileCommands(program, deps);
  registerAssetCommands(program, deps);
  registerPathCommands(program, deps);
  registerExportCommands(program, deps);

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
            { from: "user" }
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
  const defaultTagApi = createDefaultTagApi(createClient);
  const defaultRefApi = createDefaultRefApi(createClient);
  const defaultGraphApi = createDefaultGraphApi(createClient);
  const defaultAvApi = createDefaultAvApi(createClient);
  const defaultTemplateApi = createDefaultTemplateApi(createClient);
  const defaultFileApi = createDefaultFileApi(createClient);
  const defaultAssetApi = createDefaultAssetApi(createClient);
  const defaultPathApi = createDefaultPathApi(createClient);
  const defaultExportApi = createDefaultExportApi(createClient);

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
  const tagApi = input.tagApi ? bindTagApi(input.tagApi, defaultTagApi) : defaultTagApi;
  const refApi = input.refApi ? bindRefApi(input.refApi, defaultRefApi) : defaultRefApi;
  const graphApi = input.graphApi
    ? bindGraphApi(input.graphApi, defaultGraphApi)
    : defaultGraphApi;
  const avApi = input.avApi ? bindAvApi(input.avApi, defaultAvApi) : defaultAvApi;
  const templateApi = input.templateApi
    ? bindTemplateApi(input.templateApi, defaultTemplateApi)
    : defaultTemplateApi;
  const fileApi = input.fileApi ? bindFileApi(input.fileApi, defaultFileApi) : defaultFileApi;
  const assetApi = input.assetApi
    ? bindAssetApi(input.assetApi, defaultAssetApi)
    : defaultAssetApi;
  const pathApi = input.pathApi
    ? bindPathApi(input.pathApi, defaultPathApi)
    : defaultPathApi;
  const exportApi = input.exportApi
    ? bindExportApi(input.exportApi, defaultExportApi)
    : defaultExportApi;

  return {
    systemApi,
    notebookApi,
    docApi,
    blockApi,
    attrApi,
    sqlApi,
    workflowApi,
    tagApi,
    refApi,
    graphApi,
    avApi,
    templateApi,
    fileApi,
    assetApi,
    pathApi,
    exportApi,
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

function prependGlobalFlags(argv: string[], flags: SiyuanConfigFlags): string[] {
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

function createDefaultAvApi(createClient: () => SiyuanClient): AvApi {
  return {
    get: async (id: string) => createClient().getAttributeView(id),
    render: async (input) => createClient().renderAttributeView(input),
    keys: async (id: string) => createClient().getAttributeViewKeysByAvID(id),
    primaryValues: async (id: string) => createClient().getAttributeView(id),
    search: async (input) =>
      createClient().renderAttributeView({
        id: input.id,
        query: input.query,
        page: input.page,
        pageSize: input.pageSize,
        groupPaging: input.groupPaging
      }),
    relationKeys: async (id: string) => createClient().getAttributeView(id),
    filterSort: async (input) =>
      createClient().renderAttributeView({
        id: input.id,
        viewID: input.viewID
      }),
    views: async (id: string) => {
      const value = await createClient().getAttributeView(id);
      const av = extractObjectField(value, "av") ?? value;
      return extractArrayField(av, "views") ?? [];
    },
    setCell: async (input) => createClient().setAttributeViewBlockAttr(input),
    addKey: async (input) => createClient().addAttributeViewKey(input),
    updateKey: async (input) => createClient().updateAttributeViewKey(input),
    removeKey: async (input) => createClient().removeAttributeViewKey(input),
    addBlocks: async (input) => createClient().addAttributeViewBlocks(input),
    removeBlocks: async (input) => createClient().removeAttributeViewBlocks(input),
    addDetachedRows: async (input) => createClient().addAttributeViewBlocks(input),
    setName: async (avID, name) => createClient().setAttributeViewName(avID, name)
  };
}

function createDefaultTemplateApi(createClient: () => SiyuanClient): TemplateApi {
  return {
    render: async (input) => createClient().renderTemplate(input),
    renderSprig: async (input) => createClient().renderSprig(input)
  };
}

function createDefaultFileApi(createClient: () => SiyuanClient): FileApi {
  void createClient;

  return {
    put: async (input) => {
      await mkdir(dirname(input.path), { recursive: true });
      const exists = await pathExists(input.path);
      if (exists && !input.overwrite) {
        throw new SiyuanCliError("FILE_EXISTS", "Managed file already exists", {
          path: input.path
        });
      }

      await writeFile(input.path, input.content, "utf8");
      return {
        path: input.path,
        bytes: Buffer.byteLength(input.content, "utf8"),
        overwritten: exists
      };
    },
    get: async (path) => {
      try {
        const content = await readFile(path, "utf8");
        return { path, content };
      } catch (error) {
        throw toFileNotFoundError(path, error);
      }
    },
    list: async (path) => {
      await mkdir(path, { recursive: true });
      const entries = await readdir(path, { withFileTypes: true });
      const results = await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .map(async (entry) => {
            const entryPath = `${path}/${entry.name}`;
            const info = await stat(entryPath);
            return {
              name: entry.name,
              path: entryPath,
              size: info.size,
              modifiedAt: info.mtime.toISOString()
            };
          })
      );
      return results.sort((a, b) => a.name.localeCompare(b.name));
    },
    remove: async (input) => {
      try {
        await rm(input.path, { force: false });
      } catch (error) {
        throw toFileNotFoundError(input.path, error);
      }

      return {
        removed: true,
        path: input.path,
        force: true
      };
    }
  };
}

function createDefaultAssetApi(createClient: () => SiyuanClient): AssetApi {
  return {
    upload: async (input) => createClient().uploadAsset(input)
  };
}

function createDefaultPathApi(createClient: () => SiyuanClient): PathApi {
  return {
    docId: async (path: string) => {
      const result = await resolvePathByHPath(createClient, path);
      return { path, id: result?.id ?? null };
    },
    docHPath: async (id: string) => ({ id, hpath: await createClient().getHPathByID(id) }),
    docPath: async (id: string) => ({
      id,
      path: await queryOptionalStringField(createClient, id, "path")
    }),
    docIds: async (paths: string[]) =>
      Promise.all(
        paths.map(async (path) => {
          const result = await resolvePathByHPath(createClient, path);
          return { path, id: result?.id ?? null };
        })
      ),
    blockDoc: async (id: string) => {
      const info = await createClient().getBlockInfo(id);
      return { id, docId: extractStringField(info, "rootID") };
    },
    blockRoot: async (id: string) => {
      const info = await createClient().getBlockInfo(id);
      return { id, rootId: extractStringField(info, "rootID") };
    },
    blockHPath: async (id: string) => {
      const info = await createClient().getBlockInfo(id);
      const rootId = extractStringField(info, "rootID");
      return {
        id,
        rootId,
        hpath: rootId ? await createClient().getHPathByID(rootId) : null
      };
    }
  };
}

function createDefaultExportApi(createClient: () => SiyuanClient): ExportApi {
  return {
    resources: async (input) => {
      const rootId = await resolveRootDocId(createClient, input.id);
      const exported = await createClient().exportMarkdown(rootId);
      const markdown = extractStringField(exported, "content");

      if (!markdown) {
        throw new SiyuanCliError(
          "EXPORT_RESOURCES_SOURCE_EMPTY",
          "Document markdown content is empty or unavailable",
          { id: input.id, rootId }
        );
      }

      const paths = extractAssetExportPaths(markdown);
      if (paths.length === 0) {
        throw new SiyuanCliError(
          "EXPORT_RESOURCES_NOT_FOUND",
          "No asset references found in document markdown",
          { id: input.id, rootId }
        );
      }

      return createClient().exportResources({
        paths,
        name: input.name
      });
    }
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

function createDefaultTagApi(createClient: () => SiyuanClient): TagApi {
  return {
    list: async (input) => createClient().getTags(input),
    rename: async (oldLabel: string, newLabel: string) => {
      await createClient().renameTag(oldLabel, newLabel);
      return { oldLabel, newLabel };
    },
    remove: async (label: string) => {
      await createClient().removeTag(label);
      return { label, removed: true };
    },
    setDocTags: async (id: string, tags: string) => {
      await createClient().setDocTags(id, tags);
      return { id, tags };
    }
  };
}

function createDefaultRefApi(createClient: () => SiyuanClient): RefApi {
  return {
    refresh: async (id: string) => {
      await createClient().refreshBacklink(id);
      return { id, refreshed: true };
    },
    backlinks: async (input) => createClient().getBacklink(input),
    docBacklinks: async (input) => createClient().getBacklinkDoc(input),
    docBackmentions: async (input) => createClient().getBackmentionDoc(input),
    transfer: async (input) => {
      await createClient().transferBlockRef(input);
      return input;
    }
  };
}

function createDefaultGraphApi(createClient: () => SiyuanClient): GraphApi {
  return {
    global: async (input) => createClient().getGraph(input),
    local: async (input) => createClient().getLocalGraph(input),
    resetGlobal: async () => createClient().resetGraph(),
    resetLocal: async () => createClient().resetLocalGraph()
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

function bindAvApi(avApi: Partial<AvApi>, fallback: AvApi): AvApi {
  return {
    get: avApi.get?.bind(avApi) ?? fallback.get,
    render: avApi.render?.bind(avApi) ?? fallback.render,
    keys: avApi.keys?.bind(avApi) ?? fallback.keys,
    primaryValues: avApi.primaryValues?.bind(avApi) ?? fallback.primaryValues,
    search: avApi.search?.bind(avApi) ?? fallback.search,
    relationKeys: avApi.relationKeys?.bind(avApi) ?? fallback.relationKeys,
    filterSort: avApi.filterSort?.bind(avApi) ?? fallback.filterSort,
    views: avApi.views?.bind(avApi) ?? fallback.views,
    setCell: avApi.setCell?.bind(avApi) ?? fallback.setCell,
    addKey: avApi.addKey?.bind(avApi) ?? fallback.addKey,
    updateKey: avApi.updateKey?.bind(avApi) ?? fallback.updateKey,
    removeKey: avApi.removeKey?.bind(avApi) ?? fallback.removeKey,
    addBlocks: avApi.addBlocks?.bind(avApi) ?? fallback.addBlocks,
    removeBlocks: avApi.removeBlocks?.bind(avApi) ?? fallback.removeBlocks,
    addDetachedRows: avApi.addDetachedRows?.bind(avApi) ?? fallback.addDetachedRows,
    setName: avApi.setName?.bind(avApi) ?? fallback.setName
  };
}

function bindTemplateApi(
  templateApi: Partial<TemplateApi>,
  fallback: TemplateApi
): TemplateApi {
  return {
    render: templateApi.render?.bind(templateApi) ?? fallback.render,
    renderSprig: templateApi.renderSprig?.bind(templateApi) ?? fallback.renderSprig
  };
}

function bindFileApi(fileApi: Partial<FileApi>, fallback: FileApi): FileApi {
  return {
    put: fileApi.put?.bind(fileApi) ?? fallback.put,
    get: fileApi.get?.bind(fileApi) ?? fallback.get,
    list: fileApi.list?.bind(fileApi) ?? fallback.list,
    remove: fileApi.remove?.bind(fileApi) ?? fallback.remove
  };
}

function bindAssetApi(assetApi: Partial<AssetApi>, fallback: AssetApi): AssetApi {
  return {
    upload: assetApi.upload?.bind(assetApi) ?? fallback.upload
  };
}

function bindPathApi(pathApi: Partial<PathApi>, fallback: PathApi): PathApi {
  return {
    docId: pathApi.docId?.bind(pathApi) ?? fallback.docId,
    docHPath: pathApi.docHPath?.bind(pathApi) ?? fallback.docHPath,
    docPath: pathApi.docPath?.bind(pathApi) ?? fallback.docPath,
    docIds: pathApi.docIds?.bind(pathApi) ?? fallback.docIds,
    blockDoc: pathApi.blockDoc?.bind(pathApi) ?? fallback.blockDoc,
    blockRoot: pathApi.blockRoot?.bind(pathApi) ?? fallback.blockRoot,
    blockHPath: pathApi.blockHPath?.bind(pathApi) ?? fallback.blockHPath
  };
}

function bindExportApi(
  exportApi: Partial<ExportApi>,
  fallback: ExportApi
): ExportApi {
  return {
    resources: exportApi.resources?.bind(exportApi) ?? fallback.resources
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

function bindTagApi(tagApi: Partial<TagApi>, fallback: TagApi): TagApi {
  return {
    list: tagApi.list?.bind(tagApi) ?? fallback.list,
    rename: tagApi.rename?.bind(tagApi) ?? fallback.rename,
    remove: tagApi.remove?.bind(tagApi) ?? fallback.remove,
    setDocTags: tagApi.setDocTags?.bind(tagApi) ?? fallback.setDocTags
  };
}

function bindRefApi(refApi: Partial<RefApi>, fallback: RefApi): RefApi {
  return {
    refresh: refApi.refresh?.bind(refApi) ?? fallback.refresh,
    backlinks: refApi.backlinks?.bind(refApi) ?? fallback.backlinks,
    docBacklinks: refApi.docBacklinks?.bind(refApi) ?? fallback.docBacklinks,
    docBackmentions: refApi.docBackmentions?.bind(refApi) ?? fallback.docBackmentions,
    transfer: refApi.transfer?.bind(refApi) ?? fallback.transfer
  };
}

function bindGraphApi(graphApi: Partial<GraphApi>, fallback: GraphApi): GraphApi {
  return {
    global: graphApi.global?.bind(graphApi) ?? fallback.global,
    local: graphApi.local?.bind(graphApi) ?? fallback.local,
    resetGlobal: graphApi.resetGlobal?.bind(graphApi) ?? fallback.resetGlobal,
    resetLocal: graphApi.resetLocal?.bind(graphApi) ?? fallback.resetLocal
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

async function queryOptionalStringField(
  createClient: () => SiyuanClient,
  id: string,
  field: "path"
): Promise<string | null> {
  const stmt =
    `SELECT ${field} FROM blocks ` +
    `WHERE id = ${quoteSqlString(id)} ` +
    "ORDER BY updated DESC LIMIT 1";
  const rows = await createClient().querySql(stmt);
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  if (
    firstRow &&
    typeof firstRow === "object" &&
    field in firstRow &&
    typeof firstRow[field] === "string"
  ) {
    return firstRow[field];
  }

  return null;
}

async function queryRequiredStringField(
  createClient: () => SiyuanClient,
  id: string,
  field: "path"
): Promise<string> {
  const value = await queryOptionalStringField(createClient, id, field);
  if (value) {
    return value;
  }

  throw new Error(`Could not resolve ${field} for id ${id}`);
}

async function resolveRootDocId(
  createClient: () => SiyuanClient,
  id: string
): Promise<string> {
  const info = await createClient().getBlockInfo(id);
  const rootId = extractStringField(info, "rootID");
  if (rootId) {
    return rootId;
  }

  throw new SiyuanCliError(
    "EXPORT_RESOURCES_ROOT_NOT_FOUND",
    "Could not resolve root document for export resources",
    { id }
  );
}

function extractAssetExportPaths(markdown: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /!\[[^\]]*?\]\((assets\/[^)\s]+(?:\s+"[^"]*")?)\)/g,
    /\[[^\]]*?\]\((assets\/[^)\s]+(?:\s+"[^"]*")?)\)/g,
    /(?:src|href)=["'](assets\/[^"']+)["']/g
  ];

  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const raw = match[1]?.trim();
      if (!raw) {
        continue;
      }

      const path = raw.replace(/\s+["'][^"']*["']$/, "");
      if (path.startsWith("assets/")) {
        matches.add(`/data/${path}`);
      }
    }
  }

  return [...matches];
}

function extractStringField(value: unknown, field: string): string | null {
  if (value && typeof value === "object" && field in value) {
    const result = (value as Record<string, unknown>)[field];
    return typeof result === "string" ? result : null;
  }

  return null;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function toFileNotFoundError(path: string, error: unknown): SiyuanCliError {
  return new SiyuanCliError("FILE_NOT_FOUND", "Managed file not found", {
    path,
    message: error instanceof Error ? error.message : String(error)
  });
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

function extractObjectField(
  value: unknown,
  key: string
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const field = (value as Record<string, unknown>)[key];
  return field && typeof field === "object" && !Array.isArray(field)
    ? (field as Record<string, unknown>)
    : null;
}

function extractArrayField(value: unknown, key: string): unknown[] | null {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const field = (value as Record<string, unknown>)[key];
  return Array.isArray(field) ? field : null;
}
