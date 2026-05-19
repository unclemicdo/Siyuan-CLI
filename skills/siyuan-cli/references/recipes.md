# Recipes

## Create or update a document by path

Use when the user wants a path-based write that should succeed whether the document exists or not.
This workflow is best for idempotent create-or-append text. It is not the right entrypoint for creating a new document with a full multiline Markdown body.

Replace placeholder values such as `nb-1` and `doc-1` with real notebook or document ids from the target instance.

```bash
sy workflow doc-upsert --notebook nb-1 --path /Projects/Alpha --json <<'EOF'
Follow-up note
EOF
```

Check:

- `ok` is `true`
- `data.docId` exists
- `data.created` tells you whether a new document was created

## Append meeting follow-up when only a document path is known

1. Resolve the path.
2. Append to the returned id.
3. If `doc resolve-path` returns `null`, do not continue to `block append`. Switch to `doc create` or `workflow doc-upsert` instead.

```bash
sy doc resolve-path --path /Projects/Alpha --json
sy block append --parent-id doc-1 --json <<'EOF'
Meeting summary
EOF
```

If the task is path/id translation rather than mutation orchestration, prefer the `path` helpers:

```bash
sy path doc-id --path /Projects/Alpha --json
sy path block-root --id block-1 --json
```

## Create a document from multiline Markdown

Default path: stdin heredoc. No file management, no shell escaping, works for content up to ~256KB.

```bash
sy doc create --notebook nb-1 --path /Projects/Alpha --json <<'EOF'
# Alpha

- status: `todo`
- owner: `agent`
EOF
```

Fallback path: `--markdown-file` + `--cleanup-input-file` for content >256KB or already stored in a file.
If the file was generated just for this command, write it under the current working directory, pass the absolute path, and add `--cleanup-input-file` so a successful write deletes it automatically.
In sandboxed agent environments, avoid `/tmp` and `$TMPDIR` for these one-off input files.

```bash
WORKDIR="$(pwd)"
INPUT_FILE="$WORKDIR/.sy-input-alpha.md"
cat > "$INPUT_FILE" <<'EOF'
# Alpha (long document >256KB)

- status: `todo`
- owner: `agent`
EOF
sy doc create --notebook nb-1 --path /Projects/Alpha --markdown-file "$INPUT_FILE" --cleanup-input-file --json
```

## Append multiline block content

Default path: stdin heredoc. No file management needed.

```bash
sy block append --parent-id doc-1 --json <<'EOF'
- source_block: `doc-1`
  author: `agent`
  comment_status: `open`
  body: Follow-up note
EOF
```

Fallback path: `--data-file` + `--cleanup-input-file` for content >256KB or already stored in a file.

```bash
WORKDIR="$(pwd)"
INPUT_FILE="$WORKDIR/.sy-input-comment.md"
cat > "$INPUT_FILE" <<'EOF'
- source_block: `doc-1`
  author: `agent`
  body: Follow-up note (very long content >256KB)
EOF
sy block append --parent-id doc-1 --data-file "$INPUT_FILE" --cleanup-input-file --json
```

## Inspect and update an AV table

Use `av keys` and `av views` first so later mutations use real ids from the target instance.

```bash
sy av keys --id av-1 --json
sy av views --id av-1 --json
sy av set-cell --av-id av-1 --key-id key-1 --row-id row-1 --value "ready" --value-type text --json
```

Agent note:

- Plain text values are fine for text-like fields because the CLI wraps them before calling the SiYuan API.
- For non-text columns, pass the correct `--value-type` and value shape instead of guessing.

## Render templates correctly

Use `template render` only with the official API inputs: a block or document id plus the workspace absolute `.sy` file path.

```bash
sy template render \
  --id 20260424221816-4d8he48 \
  --path /Users/name/SiYuan/Workspace/data/20260224143238-p14slum/20260424221816-4d8he48.sy \
  --preview \
  --json
```

Use `template render-sprig` for raw template rendering without document context:

```bash
sy template render-sprig --json <<'EOF'
Hello {{ "world" | upper }}
EOF
```

Do not retry either command with `--var` or `--vars`. The current CLI rejects them.

## Use managed file scopes instead of arbitrary files

Use these commands when an agent needs durable but bounded artifacts for reports, exported text, or cache entries.
If the source file for `stage-put` is agent-generated, create it under the current working directory, pass an absolute path, and avoid `/tmp` or `$TMPDIR` in sandboxed environments.

```bash
sy file put-report --name review.md --overwrite --json <<'EOF'
# Review
EOF
sy file list --scope report --json
sy file get --scope report --name review.md --json
WORKDIR="$(pwd)"
INPUT_FILE="$WORKDIR/.sy-input-stage.md"
sy file stage-put --name temp-input.md --content-file "$INPUT_FILE" --cleanup-input-file --json
sy file stage-get --name temp-input.md --json
```

Managed locations:

- `put-cache` -> `data/.sy-cli/cache/...`
- `put-export` -> `data/.sy-cli/exports/...`
- `put-report` -> `data/.sy-cli/reports/...`
- `stage-put` -> `/tmp/sy-cli/staging/...`

## Upload an asset

If the local file is agent-generated for this run, prefer a current-working-directory absolute path instead of `/tmp` or `$TMPDIR` in sandboxed environments.

```bash
WORKDIR="$(pwd)"
ASSET_FILE="$WORKDIR/example.png"
sy asset upload --file "$ASSET_FILE" --upload-name example.png --json
```

Use this when a later document write needs a valid SiYuan asset path instead of a local temp file path.

## Apply, update, or clear document tags

Use `tag set-doc` for write-path tag operations on one known document id.
This command writes the document root `tags` attribute, so it needs a document id rather than a tag id.

```bash
sy tag set-doc --id doc-1 --tags "AI协作,PDCA,知识管理" --json
sy tag set-doc --id doc-1 --tag "项目管理" "周报" --json
sy tag set-doc --id doc-1 --clear --json
```

To verify document tag writes, prefer:

```bash
sy attr get --id doc-1 --json
sy tag list --json
```

## Rename or remove a tag label

Use these when the task is changing or deleting a label in the knowledge base.

```bash
sy tag rename --old-label "AI Agent" --new-label "AI协作" --json
sy tag remove --label "待清理标签" --json
```

## Export a document for downstream tools

```bash
sy doc export-md --id doc-1 --json
```

Check `data.content` before handing it to another tool.

## Export assets referenced by a document tree

```bash
sy export resources --id doc-1 --name doc-1-assets --json
```

Agent note:

- The input can be a document id or block id.
- The command resolves the root document and exports only assets referenced from that document tree.
- If the document has no asset references, expect a structured failure instead of an empty export.

## Query note data and convert it into a report

```bash
sy sql query --stmt "SELECT id FROM blocks LIMIT 5" --json
sy workflow sql-report --stmt "SELECT id FROM blocks LIMIT 5" --json
```

Use `sql query` for inspection and `workflow sql-report` when downstream consumers benefit from `{ rowCount, rows }`.

## Apply many block operations with per-item status

Pass operations through `--operations` JSON or stdin and prefer `workflow block-batch` over manual loops when the user wants a single batched result envelope.

```bash
sy workflow block-batch --operations '[{"op":"append","payload":{"parentID":"doc-1","data":"Follow-up note","dataType":"markdown"}}]' --json
```
