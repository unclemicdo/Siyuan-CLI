# Knowledge Management

Use this reference when the task is about note tags, backlinks, backmentions, graph inspection, or block-ref migration through `sy`.

Keep this reference command-oriented. It is for accurate CLI selection and invocation, not for human-agent collaboration policy.

## Tags

For fast agent lookup:

- write or replace tags on one document: `sy tag set-doc --id <doc-id> ... --json`
- clear tags on one document: `sy tag set-doc --id <doc-id> --clear --json`
- rename one label globally: `sy tag rename --old-label <label> --new-label <label> --json`
- remove one label globally: `sy tag remove --label <label> --json`
- inspect current tag index: `sy tag list --json`

Agent note:

- `tag set-doc` writes the document root `tags` attribute, not a separate tag-id resource
- verify document tag writes with `sy attr get --id <doc-id> --json`
- verify tag index visibility with `sy tag list --json`

### Scene

List existing tags.

### Command

`sy tag list --json`

### Key parameters

- `--sort <mode>`: optional tag sort mode
- `--app <id>`: optional app id, defaults to `sy-cli`
- `--no-ignore-max-list-hint`: include normal max-list behavior instead of the default full listing hint bypass

### Example

```bash
sy tag list --sort 4 --json
```

## Rename a tag

### Scene

Rename one existing tag label everywhere it is used.

### Command

`sy tag rename --old-label <label> --new-label <label> --json`

### Key parameters

- `--old-label <label>`: existing tag label
- `--new-label <label>`: replacement tag label

### Example

```bash
sy tag rename --old-label "AI Agent" --new-label "AI协作" --json
```

## Remove a tag

### Scene

Remove one tag label from the knowledge base.

### Command

`sy tag remove --label <label> --json`

### Key parameters

- `--label <label>`: tag label to remove

### Example

```bash
sy tag remove --label "待清理标签" --json
```

## Set document tags

### Scene

Set or replace native tags on one known document id.

### Command

`sy tag set-doc --id <doc-id> ... --json`

### Key parameters

- `--id <doc-id>`: target document id
- `--tags <csv>`: comma-separated tag list
- `--tag <value...>`: repeated or variadic tag values
- `--clear`: remove all tags on the target document

### Example

```bash
sy tag set-doc --id doc-1 --tags "AI协作,PDCA,知识管理" --json
sy tag set-doc --id doc-1 --tag "项目管理" "周报" --json
sy tag set-doc --id doc-1 --clear --json
```

## Query backlinks and backmentions

### Scene

Inspect backlink and mention state for one block.

### Command

`sy ref backlinks --id <block-id> --json`

### Key parameters

- `--id <block-id>`: target block id
- `--keyword <text>`: filter backlink text
- `--mention-keyword <text>`: filter mention text
- `--before-len <count>`: snippet context length
- `--contain-children`: include child blocks

### Example

```bash
sy ref backlinks --id block-1 --keyword "PDCA" --mention-keyword "复盘" --before-len 24 --json
```

## Query document backlinks

### Scene

Inspect backlinks for one definition document within one reference tree.

### Command

`sy ref doc-backlinks --def-id <doc-id> --ref-tree-id <doc-id> --json`

### Key parameters

- `--def-id <doc-id>`: definition document id
- `--ref-tree-id <doc-id>`: reference tree document id
- `--keyword <text>`: optional filter
- `--contain-children`: include child content
- `--no-highlight`: disable highlight output

### Example

```bash
sy ref doc-backlinks --def-id doc-a --ref-tree-id doc-b --keyword "调研" --contain-children --json
```

## Query document backmentions

### Scene

Inspect mention results for one definition document within one reference tree.

### Command

`sy ref doc-backmentions --def-id <doc-id> --ref-tree-id <doc-id> --json`

### Key parameters

- `--def-id <doc-id>`: definition document id
- `--ref-tree-id <doc-id>`: reference tree document id
- `--keyword <text>`: optional filter
- `--contain-children`: include child content
- `--no-highlight`: disable highlight output

### Example

```bash
sy ref doc-backmentions --def-id doc-a --ref-tree-id doc-b --keyword "知识图谱" --json
```

## Refresh backlink state

### Scene

Refresh backlink calculation for one block before querying again.

### Command

`sy ref refresh --id <block-id> --json`

### Key parameters

- `--id <block-id>`: target block id

### Notes

- SiYuan >= 3.8.1 requires an admin, non-read-only token for this endpoint; the CLI's normal admin configuration is unaffected.

### Example

```bash
sy ref refresh --id block-1 --json
```

## Transfer block references

### Scene

Move existing block references from one definition block to another.

### Command

`sy ref transfer --from-id <block-id> --to-id <block-id> --json`

### Key parameters

- `--from-id <block-id>`: source definition block id
- `--to-id <block-id>`: target definition block id
- `--ref-id <id...>`: optional specific referencing block ids; omit to transfer all

### Example

```bash
sy ref transfer --from-id block-old --to-id block-new --ref-id ref-1 ref-2 --json
```

## Query global graph

### Scene

Inspect global graph data for a keyword or full graph request.

### Command

`sy graph global --json`

### Key parameters

- `--query <text>`: graph keyword query
- `--conf <json>`: inline graph config JSON
- `--conf-file <path>`: graph config JSON file
- `--req-id <id>`: optional request id

### Notes

- SiYuan >= 3.8.1 persists the `--conf` graph configuration only for admin, non-read-only tokens; non-admin runs still return the graph but the configuration is not saved.

### Example

```bash
sy graph global --query "AI协作" --conf '{"depth":2}' --req-id graph-1 --json
```

## Query local graph

### Scene

Inspect local graph data around one known document or block id.

### Command

`sy graph local --id <id> --json`

### Key parameters

- `--id <id>`: root document or block id
- `--query <text>`: local graph keyword query
- `--conf <json>`: inline graph config JSON
- `--conf-file <path>`: graph config JSON file
- `--req-id <id>`: optional request id

### Example

```bash
sy graph local --id doc-1 --query "项目复盘" --conf '{"depth":2}' --json
```

## Reset graph configuration

### Scene

Reset stored graph configuration to official defaults.

### Command

`sy graph reset --scope <scope> --json`

### Key parameters

- `--scope <scope>`: `global` or `local`

### Example

```bash
sy graph reset --scope global --json
sy graph reset --scope local --json
```
