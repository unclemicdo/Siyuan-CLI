---
name: siyuan-cli
description: Use when an agent needs to operate SiYuan through this repository's `sy` CLI instead of direct HTTP or MCP note writes, or when the user mentions Siyuan CLI, `sy` commands, command selection, `--json`, path/id resolution, AV work, template rendering, managed file staging, resource export, or recovering from `CONFIG_*`, `API_*`, `SQL_*`, or other structured CLI failures.
---

# Siyuan CLI

Use this skill when the user wants work done through this repository's `sy` CLI rather than through direct HTTP calls or MCP tools.

## Defaults

- Prefer direct CLI execution over REPL for agent work.
- Prefer `--json` unless the user explicitly wants human-formatted output.
- Validate configuration early when the task depends on a live SiYuan target.
- Prefer the shortest reliable command path.
- If global `sy ...` is installed and available, prefer using it directly.
- If global `sy ...` is not available, fall back to `npm run dev -- ...` only when the current working directory is this repository root.
- Prefer workflow commands when they remove orchestration without hiding important behavior.
- Prefer `doc create --markdown-file` for multiline document creation and `block append --data-file` for multiline block appends. Do not assume other block mutations accept file-input flags.
- If the file was generated just for this run, write it under the current working directory, pass the absolute path to the CLI, and add `--cleanup-input-file` only on commands that support it so successful writes remove the temporary file.
- If a mutation target is given as a readable path rather than an id, prefer `doc resolve-path` or `path doc-id` before block-level writes.
- Treat destructive mutations such as `doc remove`, `block remove`, `tag remove`, and broad tag renames as confirmation-worthy unless the user intent is already explicit.

## Boundaries

- Do not use this skill when the user explicitly wants direct SiYuan HTTP requests or MCP note tools.
- Do not assume `npm run dev -- ...` is available from arbitrary directories; it is a repository-root fallback, not a global command.

## Fast Routing

- Preflight live connectivity with `system version --json`.
- Use `workflow doc-upsert` for path-based create-or-append writes.
- Use `doc create --markdown-file` when creating a new document from a full multiline Markdown body.
- Use `block append` or `block update` when the target id is already known.
- Use `path doc-id`, `path doc-hpath`, `path doc-path`, `path block-doc`, `path block-root`, and `path block-hpath` for path/id resolution. Do not assume `path block-kramdown` exists.
- Use `av ...` for database or Attribute View reads and schema/cell changes. Do not fall back to SQL writes.
- Use `template render` only as the official SiYuan template API passthrough.
- Use `template render-sprig` only for raw sprig template rendering.
- Use `file ...` only for managed `cache`, `export`, and `report` scopes plus staging under `/tmp/sy-cli/staging`.
- Use `asset upload` for file-to-asset ingestion.
- Use `export resources --id <doc-or-block-id>` to export assets referenced by a document tree.

## High-Risk Gotchas

- `template render` requires both `--id` and `--path`, and `--path` must be a workspace filesystem absolute path such as `/Users/name/SiYuan/.../doc.sy`. It is not an hpath like `/Notebook/Doc`.
- `template render` and `template render-sprig` do not support CLI-side `--var` or `--vars`.
- In sandboxed agent environments, avoid `/tmp` and `$TMPDIR` for generated multiline input files. Different processes may resolve them differently. Use a current-working-directory absolute path instead.
- `file` is intentionally not arbitrary filesystem access. It only writes to managed `data/.sy-cli/{cache,exports,reports}` and staging under `/tmp/sy-cli/staging`.
- `export resources` is document-centric: it resolves the root document and exports only referenced assets. A document with no asset refs returns a structured not-found style failure instead of an empty success.
- `av set-cell` accepts plain text for text-like fields because the CLI wraps it into the API value object. For non-text fields, pass the correct `--value-type` and value shape.
- `doc resolve-path` and `path doc-id` work with SiYuan document paths, not workspace filesystem `.sy` file paths.

## Routing

- Read `references/command-selection.md` when choosing commands.
- Read `references/knowledge-management.md` when the task is about tags, backlinks, backmentions, graph queries, or block-ref migration.
- Read `references/recipes.md` when the task spans multiple CLI steps.
- Read `references/error-handling.md` when setup is uncertain or a command fails.
