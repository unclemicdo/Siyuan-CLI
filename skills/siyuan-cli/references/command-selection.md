# Command Selection

## Invocation choice

- Prefer global `sy ...` when it is installed and available on `PATH`.
- If global `sy ...` is unavailable, use `npm run dev -- ...` only from this repository root.
- For agent use, always prefer commands that end in `--json`.

## Preflight

- Verify connectivity with `sy system version --json` when `sy` is available.
- Otherwise run `npm run dev -- system version --json` from the repository root.
- If the task depends on existing content and the user only provides a readable path, resolve it before mutation.
- If the task is about tags, backlinks, backmentions, graph views, or ref transfer, read `knowledge-management.md`.

## Preferred command mapping

| Need | Preferred command | Notes |
| --- | --- | --- |
| Create a new document at a known path | `doc create` | Use when the task is explicitly create-only. Prefer stdin heredoc for content; fall back to `--markdown-file` for content >256KB or already in a file. |
| Create-or-update a document at a path | `workflow doc-upsert` | Prefer `workflow doc-upsert` only when the write is create-or-append text, not when a new document needs a full Markdown body. |
| Convert path to document id | `doc resolve-path` | Prefer before block mutations when only a path is known. |
| Resolve one or many paths and ids with helper semantics | `path ...` | Use `path doc-id`, `doc-ids`, `doc-hpath`, `doc-path`, `block-doc`, `block-root`, or `block-hpath` when the task is primarily path/id translation. |
| Append text to known parent id | `block append` | Smallest direct mutation. Prefer stdin heredoc; fall back to `--data-file` for content >256KB or already in a file. |
| Update known block id | `block update` | Use when the target block id is already known. Prefer stdin heredoc; fall back to `--data-file`. |
| Prepend / insert around known block | `block prepend`, `block insert-before`, `block insert-after` | All support stdin heredoc and `--data-file`. |
| Perform many block operations | `workflow block-batch` | Prefer when the user wants batched structured results. |
| Read or mutate an AV / database table | `av ...` | Use `av keys`, `views`, `render`, `set-cell`, and schema commands. Do not use SQL writes as a substitute. |
| Render an official SiYuan template file | `template render` | Requires `--id` plus a workspace absolute filesystem `--path` to the `.sy` file. No CLI variable injection. |
| Render a raw sprig template string or file | `template render-sprig` | Accepts stdin heredoc or `--template-file`. `--var` and `--vars` are rejected. |
| Upload a local file into SiYuan assets | `asset upload` | Use for asset ingestion, then reference the returned asset path in later note writes if needed. |
| Save or read temporary agent artifacts safely | `file ...` | Use only managed scopes: `put-cache`, `put-export`, `put-report`, `get`, `list`, `remove`, `stage-put`, `stage-get`. Not general filesystem access. |
| Export assets referenced by a document tree | `export resources` | Accepts a document or block `--id`, resolves the root document, and exports only referenced assets. |
| Read-only analysis over note data | `sql query` | Keep queries read-only. |
| Tags, backlinks, graph, or ref transfer | See `knowledge-management.md` | Use the dedicated knowledge-management reference for command choice and examples. |
| Produce structured report output from SQL | `workflow sql-report` | Prefer when rows need downstream summarization. |
| Interactive exploration | `repl` | Prefer only for human-guided exploration, not normal automation. |

## Path Form Rules

- `doc resolve-path` and `path doc-id` expect SiYuan document paths such as `/Projects/Alpha` or `/Notebook/Projects/Alpha`.
- `template render --path` expects a workspace filesystem absolute path such as `/Users/name/SiYuan/.../doc.sy`. On SiYuan >= 3.8.1 the path must also be inside `<data>/templates/` (symlinks resolved); any other path fails with "Path [...] is not in templates directory".
- `file ...` names are safe managed filenames, not arbitrary relative paths.
- For agent-generated content, prefer stdin heredoc (no file needed). When a temp file is required (>256KB or pre-existing file), prefer a current-working-directory absolute path with `--cleanup-input-file`. In sandboxed environments, avoid `/tmp` and `$TMPDIR` for file-based inputs.

## Repo-root Fallback Rule

- `npm run dev -- ...` is a repository-local fallback, not a general replacement for `sy ...`.
- If the agent is outside this repository and no global `sy` exists, it should change into the repo root first or stop and explain the missing execution path.
