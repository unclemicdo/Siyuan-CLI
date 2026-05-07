# Recipes

## Create or update a document by path

Use when the user wants a path-based write that should succeed whether the document exists or not.
This workflow is best for idempotent create-or-append text. It is not the right entrypoint for creating a new document with a full multiline Markdown body.

Replace placeholder values such as `nb-1` and `doc-1` with real notebook or document ids from the target instance.

```bash
sy workflow doc-upsert --notebook nb-1 --path /Projects/Alpha --append "Follow-up note" --json
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
sy block append --parent-id doc-1 --data "Meeting summary" --json
```

## Create a document from multiline Markdown

Use `--markdown-file` for multiline content so shells do not write literal `\n` text.
If the file was generated just for this command, add `--cleanup-input-file` so a successful write deletes it automatically.

```bash
cat > /tmp/alpha.md <<'EOF'
# Alpha

- status: `todo`
- owner: `agent`
EOF
sy doc create --notebook nb-1 --path /Projects/Alpha --markdown-file /tmp/alpha.md --cleanup-input-file --json
```

## Append multiline block content

Use `--data-file` for multiline comments, reports, and structured blocks.
If the file was generated just for this command, add `--cleanup-input-file` so a successful append deletes it automatically.

```bash
cat > /tmp/comment.md <<'EOF'
- source_block: `doc-1`
  author: `agent`
  comment_status: `open`
  body: Follow-up note
EOF
sy block append --parent-id doc-1 --data-file /tmp/comment.md --cleanup-input-file --json
```

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
