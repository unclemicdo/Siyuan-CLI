# Command Selection

## Invocation choice

- Prefer global `sy ...` when it is installed and available on `PATH`.
- If global `sy ...` is unavailable, use `npm run dev -- ...` from the repository root.
- For agent use, always prefer commands that end in `--json`.

## Preflight

- Verify connectivity with `sy system version --json` when `sy` is available.
- Otherwise run `npm run dev -- system version --json` from the repository root.
- If the task depends on existing content and the user only provides a readable path, resolve it before mutation.
- If the task is about tags, backlinks, backmentions, graph views, or ref transfer, read `knowledge-management.md`.

## Preferred command mapping

| Need | Preferred command | Notes |
| --- | --- | --- |
| Create a new document at a known path | `doc create` | Use when the task is explicitly create-only. Prefer `doc create --markdown-file` for full multiline Markdown content. |
| Create-or-update a document at a path | `workflow doc-upsert` | Prefer `workflow doc-upsert` only when the write is create-or-append text, not when a new document needs a full Markdown body. |
| Convert path to document id | `doc resolve-path` | Prefer before block mutations when only a path is known. |
| Append text to known parent id | `block append` | Smallest direct mutation. Prefer `--data-file` for multiline Markdown. |
| Update known block id | `block update` | Use when the target block id is already known. |
| Perform many block operations | `workflow block-batch` | Prefer when the user wants batched structured results. |
| Read-only analysis over note data | `sql query` | Keep queries read-only. |
| Tags, backlinks, graph, or ref transfer | See `knowledge-management.md` | Use the dedicated knowledge-management reference for command choice and examples. |
| Produce structured report output from SQL | `workflow sql-report` | Prefer when rows need downstream summarization. |
| Interactive exploration | `repl` | Prefer only for human-guided exploration, not normal automation. |
