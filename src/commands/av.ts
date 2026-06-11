import { Command } from "commander";
import { z } from "zod";
import { SiyuanCliError } from "../core/errors.js";
import { formatFailure, formatSuccess } from "../core/output.js";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export interface AvApi {
  get: (id: string) => Promise<unknown>;
  render: (input: {
    id: string;
    viewID?: string;
    blockID?: string;
    query?: string;
    page?: number;
    pageSize?: number;
    groupPaging?: Record<string, unknown>;
    config?: Record<string, unknown>;
    createIfNotExist?: boolean;
  }) => Promise<unknown>;
  keys: (id: string) => Promise<unknown>;
  primaryValues: (id: string) => Promise<unknown>;
  search: (input: {
    id: string;
    query: string;
    page?: number;
    pageSize?: number;
    groupPaging?: Record<string, unknown>;
  }) => Promise<unknown>;
  relationKeys: (id: string) => Promise<unknown>;
  filterSort: (input: { id: string; viewID?: string }) => Promise<unknown>;
  views: (id: string) => Promise<unknown>;
  setCell: (input: {
    avID: string;
    keyID: string;
    rowID: string;
    value: unknown;
    valueType?: string;
  }) => Promise<unknown>;
  addKey: (input: {
    avID: string;
    keyID: string;
    keyName: string;
    keyType: string;
    keyIcon?: string;
    previousKeyID?: string;
  }) => Promise<unknown>;
  updateKey: (input: {
    avID: string;
    keyID: string;
    keyName?: string;
    keyType?: string;
    keyIcon?: string;
    previousKeyID?: string;
  }) => Promise<unknown>;
  removeKey: (input: {
    avID: string;
    keyID: string;
    removeRelationDest?: boolean;
  }) => Promise<unknown>;
  addBlocks: (input: { avID: string; srcs: Array<{ id: string; isDetached: boolean }> }) => Promise<unknown>;
  removeBlocks: (input: { avID: string; srcIDs: string[] }) => Promise<unknown>;
  addDetachedRows: (input: { avID: string; srcs: Array<{ id: string; isDetached: boolean }> }) => Promise<unknown>;
  setName: (avID: string, name: string) => Promise<unknown>;
}

export interface AvCommandDeps {
  avApi: AvApi;
  write: (value: string) => boolean;
}

export function registerAvCommands(program: Command, deps: AvCommandDeps): void {
  const av = program.command("av");

  registerIdReadCommand(av, deps, {
    name: "get",
    command: "av.get",
    action: (id) => deps.avApi.get(id)
  });

  av
    .command("render")
    .requiredOption("--id <id>")
    .option("--view-id <id>")
    .option("--block-id <id>")
    .option("--query <text>")
    .option("--page <number>")
    .option("--page-size <number>")
    .option("--group-paging <json>")
    .option("--config <json>")
    .option("--create-if-not-exist")
    .option("--json")
    .action(
      async (options: {
        id: string;
        viewId?: string;
        blockId?: string;
        query?: string;
        page?: string;
        pageSize?: string;
        groupPaging?: string;
        config?: string;
        createIfNotExist?: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "av.render",
          json: options.json,
          action: () =>
            deps.avApi.render({
              id: options.id,
              viewID: options.viewId,
              blockID: options.blockId,
              query: options.query,
              page: parseOptionalNumber(options.page, "--page"),
              pageSize: parseOptionalNumber(options.pageSize, "--page-size"),
              groupPaging: parseOptionalJsonObject(
                options.groupPaging,
                "--group-paging"
              ),
              config: parseOptionalJsonObject(options.config, "--config"),
              createIfNotExist: options.createIfNotExist
            }),
          write: deps.write
        });
      }
    );

  registerIdReadCommand(av, deps, {
    name: "keys",
    command: "av.keys",
    action: (id) => deps.avApi.keys(id)
  });

  registerIdReadCommand(av, deps, {
    name: "primary-values",
    command: "av.primary-values",
    action: (id) => deps.avApi.primaryValues(id)
  });

  av
    .command("search")
    .requiredOption("--id <id>")
    .requiredOption("--query <text>")
    .option("--page <number>")
    .option("--page-size <number>")
    .option("--group-paging <json>")
    .option("--json")
    .action(
      async (options: {
        id: string;
        query: string;
        page?: string;
        pageSize?: string;
        groupPaging?: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "av.search",
          json: options.json,
          action: () =>
            deps.avApi.search({
              id: options.id,
              query: options.query,
              page: parseOptionalNumber(options.page, "--page"),
              pageSize: parseOptionalNumber(options.pageSize, "--page-size"),
              groupPaging: parseOptionalJsonObject(
                options.groupPaging,
                "--group-paging"
              )
            }),
          write: deps.write
        });
      }
    );

  registerIdReadCommand(av, deps, {
    name: "relation-keys",
    command: "av.relation-keys",
    action: (id) => deps.avApi.relationKeys(id)
  });

  av
    .command("filter-sort")
    .requiredOption("--id <id>")
    .option("--view-id <id>")
    .option("--json")
    .action(
      async (options: { id: string; viewId?: string; json?: boolean }) => {
        await executeCommand({
          command: "av.filter-sort",
          json: options.json,
          action: () =>
            deps.avApi.filterSort({
              id: options.id,
              viewID: options.viewId
            }),
          write: deps.write
        });
      }
    );

  registerIdReadCommand(av, deps, {
    name: "views",
    command: "av.views",
    action: (id) => deps.avApi.views(id)
  });

  av
    .command("set-cell")
    .requiredOption("--av-id <id>")
    .requiredOption("--key-id <id>")
    .requiredOption("--row-id <id>")
    .requiredOption("--value <json-or-text>")
    .option("--value-type <type>")
    .option("--json")
    .action(
      async (options: {
        avId: string;
        keyId: string;
        rowId: string;
        value: string;
        valueType?: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "av.set-cell",
          json: options.json,
          action: () =>
            deps.avApi.setCell({
              avID: options.avId,
              keyID: options.keyId,
              rowID: options.rowId,
              value: parseValueInput(options.value, options.valueType),
              valueType: options.valueType
            }),
          write: deps.write
        });
      }
    );

  av
    .command("add-key")
    .requiredOption("--av-id <id>")
    .requiredOption("--key-id <id>")
    .requiredOption("--name <name>")
    .requiredOption("--type <type>")
    .option("--icon <icon>", "", "")
    .option("--previous-key-id <id>", "", "")
    .option("--json")
    .action(
      async (options: {
        avId: string;
        keyId: string;
        name: string;
        type: string;
        icon: string;
        previousKeyId: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "av.add-key",
          json: options.json,
          action: () =>
            deps.avApi.addKey({
              avID: options.avId,
              keyID: options.keyId,
              keyName: options.name,
              keyType: options.type,
              keyIcon: options.icon,
              previousKeyID: options.previousKeyId
            }),
          write: deps.write
        });
      }
    );

  av
    .command("update-key")
    .requiredOption("--av-id <id>")
    .requiredOption("--key-id <id>")
    .option("--name <name>")
    .option("--type <type>")
    .option("--icon <icon>")
    .option("--previous-key-id <id>")
    .option("--json")
    .action(
      async (options: {
        avId: string;
        keyId: string;
        name?: string;
        type?: string;
        icon?: string;
        previousKeyId?: string;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "av.update-key",
          json: options.json,
          action: () => {
            validateUpdateKeyMutation(
              options.name,
              options.type,
              options.icon,
              options.previousKeyId
            );
            return deps.avApi.updateKey({
              avID: options.avId,
              keyID: options.keyId,
              keyName: options.name,
              keyType: options.type,
              keyIcon: options.icon,
              previousKeyID: options.previousKeyId
            });
          },
          write: deps.write
        });
      }
    );

  av
    .command("remove-key")
    .requiredOption("--av-id <id>")
    .requiredOption("--key-id <id>")
    .option("--force")
    .option("--remove-relation-dest")
    .option("--json")
    .action(
      async (options: {
        avId: string;
        keyId: string;
        force?: boolean;
        removeRelationDest?: boolean;
        json?: boolean;
      }) => {
        await executeCommand({
          command: "av.remove-key",
          json: options.json,
          action: () => {
            validateForceRequired(options.force);
            return deps.avApi.removeKey({
              avID: options.avId,
              keyID: options.keyId,
              removeRelationDest: options.removeRelationDest
            });
          },
          write: deps.write
        });
      }
    );

  av
    .command("add-blocks")
    .requiredOption("--av-id <id>")
    .requiredOption("--block-ids <ids>")
    .option("--json")
    .action(
      async (options: { avId: string; blockIds: string; json?: boolean }) => {
        await executeCommand({
          command: "av.add-blocks",
          json: options.json,
          action: () =>
            deps.avApi.addBlocks({
              avID: options.avId,
              srcs: options.blockIds.split(",").map((id: string) => ({
                id: id.trim(),
                isDetached: false
              }))
            }),
          write: deps.write
        });
      }
    );

  av
    .command("remove-blocks")
    .requiredOption("--av-id <id>")
    .requiredOption("--src-ids <ids>")
    .option("--json")
    .action(
      async (options: { avId: string; srcIds: string; json?: boolean }) => {
        await executeCommand({
          command: "av.remove-blocks",
          json: options.json,
          action: () =>
            deps.avApi.removeBlocks({
              avID: options.avId,
              srcIDs: options.srcIds.split(",").map((id: string) => id.trim())
            }),
          write: deps.write
        });
      }
    );

  av
    .command("add-detached-rows")
    .requiredOption("--av-id <id>")
    .requiredOption("--row-ids <ids>")
    .option("--json")
    .action(
      async (options: { avId: string; rowIds: string; json?: boolean }) => {
        await executeCommand({
          command: "av.add-detached-rows",
          json: options.json,
          action: () =>
            deps.avApi.addDetachedRows({
              avID: options.avId,
              srcs: options.rowIds.split(",").map((id: string) => ({
                id: id.trim(),
                isDetached: true
              }))
            }),
          write: deps.write
        });
      }
    );

  av
    .command("set-name")
    .requiredOption("--av-id <id>")
    .requiredOption("--name <name>")
    .option("--json")
    .action(
      async (options: { avId: string; name: string; json?: boolean }) => {
        await executeCommand({
          command: "av.set-name",
          json: options.json,
          action: () => deps.avApi.setName(options.avId, options.name),
          write: deps.write
        });
      }
    );
}

function registerIdReadCommand(
  parent: Command,
  deps: AvCommandDeps,
  input: {
    name: string;
    command: string;
    action: (id: string) => Promise<unknown>;
  }
): void {
  parent
    .command(input.name)
    .requiredOption("--id <id>")
    .option("--json")
    .action(async (options: { id: string; json?: boolean }) => {
      await executeCommand({
        command: input.command,
        json: options.json,
        action: () => input.action(options.id),
        write: deps.write
      });
    });
}

function parseOptionalNumber(
  raw: string | undefined,
  optionName: string
): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_NUMBER",
      `${optionName} must be a valid number`
    );
  }

  return value;
}

function parseOptionalJsonObject(
  raw: string | undefined,
  optionName: string
): Record<string, unknown> | undefined {
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      `${optionName} must be a JSON object`
    );
  }

  const result = jsonObjectSchema.safeParse(parsed);
  if (!result.success) {
    throw new SiyuanCliError(
      "VALIDATION_INVALID_JSON",
      `${optionName} must be a JSON object`,
      {
        issues: result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map(String),
          message: issue.message
        }))
      }
    );
  }

  return result.data;
}

function parseValueInput(raw: string, valueType?: string): unknown {
  const trimmed = raw.trim();
  if (!looksLikeJsonLiteral(trimmed)) {
    return wrapPrimitiveValue(raw, valueType);
  }

  try {
    return normalizeValueObject(JSON.parse(trimmed), valueType);
  } catch {
    return wrapPrimitiveValue(raw, valueType);
  }
}

function wrapPrimitiveValue(raw: string, valueType?: string): unknown {
  switch (valueType) {
    case "number": {
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new SiyuanCliError(
          "VALIDATION_INVALID_NUMBER",
          "--value must be a valid number when --value-type=number"
        );
      }
      return { number: { content: value, isNotEmpty: true } };
    }
    case "checkbox":
      return { checkbox: { checked: raw === "true" || raw === "1" } };
    case "select":
      return { mSelect: [{ content: raw }] };
    case "mSelect":
      return { mSelect: raw.split(",").map((item) => ({ content: item.trim() })).filter((item) => item.content) };
    case "text":
    case undefined:
      return { text: { content: raw } };
    default:
      return { [valueType]: { content: raw } };
  }
}

function normalizeValueObject(value: unknown, valueType?: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (
    "block" in record ||
    "text" in record ||
    "number" in record ||
    "date" in record ||
    "mSelect" in record ||
    "url" in record ||
    "email" in record ||
    "phone" in record ||
    "mAsset" in record ||
    "template" in record ||
    "checkbox" in record ||
    "relation" in record ||
    "rollup" in record
  ) {
    return record;
  }

  return valueType ? wrapPrimitiveValue(JSON.stringify(value), valueType) : record;
}

function looksLikeJsonLiteral(value: string): boolean {
  if (value === "null" || value === "true" || value === "false") {
    return true;
  }

  if (
    (value.startsWith("{") && value.endsWith("}")) ||
    (value.startsWith("[") && value.endsWith("]")) ||
    (value.startsWith("\"") && value.endsWith("\""))
  ) {
    return true;
  }

  return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value);
}

function validateForceRequired(force: boolean | undefined): void {
  if (force) {
    return;
  }

  throw new SiyuanCliError(
    "VALIDATION_FORCE_REQUIRED",
    "--force is required to remove an av key"
  );
}

function validateUpdateKeyMutation(
  name: string | undefined,
  type: string | undefined,
  icon: string | undefined,
  previousKeyId: string | undefined
): void {
  if (
    name !== undefined ||
    type !== undefined ||
    icon !== undefined ||
    previousKeyId !== undefined
  ) {
    return;
  }

  throw new SiyuanCliError(
    "VALIDATION_MISSING_MUTATION",
    "at least one mutation option must be provided"
  );
}

async function executeCommand(input: {
  command: string;
  json?: boolean;
  action: () => Promise<unknown>;
  write: (value: string) => boolean;
}): Promise<void> {
  try {
    const started = Date.now();
    const data = await input.action();
    const payload = formatSuccess(input.command, data, Date.now() - started);
    const output = input.json
      ? JSON.stringify(payload)
      : JSON.stringify(payload.data);
    input.write(`${output}\n`);
  } catch (error) {
    if (input.json) {
      const cliError =
        error instanceof SiyuanCliError
          ? error
          : new SiyuanCliError(
              "INTERNAL_ERROR",
              error instanceof Error ? error.message : "Unexpected error"
            );
      const payload = formatFailure(input.command, cliError);
      process.exitCode = 1;
      input.write(`${JSON.stringify(payload)}\n`);
      return;
    }

    throw error;
  }
}
