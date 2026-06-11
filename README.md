# Siyuan CLI

[简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)

Agent-first TypeScript CLI for SiYuan Note.

Siyuan CLI gives you a stable command-line layer over SiYuan's HTTP API. It is designed for people who want to automate note operations, run repeatable scripts, or give AI agents a safer and more predictable way to work with SiYuan content.

## Why Use Siyuan CLI

If you mainly write and edit notes by hand inside SiYuan, the GUI is usually the right tool. Siyuan CLI becomes useful when the same note action stops being a one-off task and starts becoming a repeatable workflow.

For everyday SiYuan users, that usually means turning routines like "create today's note", "append meeting follow-up", or "export this document" into one command you can trust.

For automation and Agent workflows, it means giving scripts and local AI tools a stable way to read and write SiYuan content without hand-assembling raw HTTP requests.

What that gives you in practice:

- spend less time on repetitive note housekeeping and more time on the note content itself
- keep recurring workflows consistent, such as daily logs, meeting notes, and project updates
- trigger note actions from the terminal, shell scripts, cron jobs, shortcuts, or local tools
- get stable JSON output that fits naturally into automation and Agent pipelines
- use clearer commands and safer defaults than calling the raw SiYuan HTTP API directly

Recent capability additions worth noting: Siyuan CLI now covers AV / database workflows, official template rendering, safe managed file staging for agent artifacts, direct asset upload, path/id helper lookups, and resource export for document-linked assets. The intent is to let agents and scripts handle more real SiYuan workflows through stable product commands instead of falling back to raw SQL writes or ad hoc filesystem access. These additions also make the CLI safer for automation by keeping write surfaces explicit and bounded.

## Common Use Cases

People usually reach for Siyuan CLI in moments like these:

- At the start of the day, create a dated journal, work log, or standup note from a ready-made template.
- Right after a call, append the summary and action items to the correct project document before context is lost.
- When a document needs to leave SiYuan, export it as Markdown for sharing, backup, publishing, or feeding another tool.
- When a script or Agent needs reliable context, resolve a readable path once and reuse the real document ID in later commands.
- When cleaning up or analyzing many notes at once, batch-update blocks or run SQL queries instead of editing one note at a time.
- When SiYuan is part of a local workflow, let automation or Agents read notes, write updates, and generate reports in a predictable way.

## Quick Examples

The examples below assume you already configured your token through exported environment variables or a config file. Avoid placing the token inline on the command line.

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

List available notebooks:

```bash
sy notebook list --json
```

Create a new document — content via stdin heredoc (no shell escaping, no ARG_MAX limit):

```bash
sy doc create --notebook nb-1 --path /Projects/MyDoc --json <<'EOF'
# New Document

Content with `code`, $HOME, "quotes" — all safe.
EOF
```

For content already in a file, use `--markdown-file` instead.

Append content to an existing document:

```bash
sy block append --parent-id doc-1 --json <<'EOF'
## Follow-up

- [ ] Action item 1
- [ ] Action item 2
EOF
```

Set tags on a document:

```bash
sy tag set-doc --id doc-1 --tags "AI Agent,PDCA" --json
```

Query your notes with SQL:

```bash
sy sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

Explore commands interactively with the REPL:

```bash
sy repl
```

## Requirements

- Node.js `>=22.10.0`
- A reachable SiYuan HTTP API endpoint
- A SiYuan API token

## Installation

```bash
npm install -g @unclemicdo/siyuan-cli
```

Then run:

```bash
sy system version --json
```

For local development, clone the repository and use `npm run dev` instead.

The `sy` command requires Node.js `>=22.10.0` and a configured SiYuan token/base URL.

## Agent Skill

This repository also ships a versioned `siyuan-cli` skill for Codex and Claude Code.

Canonical source:

- `skills/siyuan-cli/`

Global install:

- treat `skills/siyuan-cli/` as the single source of truth
- during local development, prefer installing the global skill as a symlink back to this directory
- choose an explicit target skill root such as `~/.codex/skills` or `~/.claude/skills`
- optional copy mode is available for machines where symlinks are not desirable

Install or refresh the global skill:

```bash
npm run skill:install -- --target-dir ~/.codex/skills --force
```

Useful variants:

```bash
npm run skill:install -- --mode copy --target-dir ~/.codex/skills --force
npm run skill:install -- --target-dir ~/.claude/skills --force
```

Usage:

- explicitly ask the agent to use the `siyuan-cli` skill when working through this CLI
- use it when the agent needs to choose commands, prefer `--json`, resolve paths to ids, or recover from `CONFIG_*`, `API_*`, or `SQL_*` failures

## First-Time Setup

You need two pieces of information before the CLI can talk to SiYuan:

- a SiYuan API token
- the SiYuan API base URL

If your SiYuan instance is running on the default local address, the base URL is usually:

```text
http://127.0.0.1:6806
```

In that case, you only need to provide a token.

### Option A: Use environment variables

This is the fastest way to get started:

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

Then run:

```bash
sy system version --json
```

### Option B: Use a config file

This is usually better if you use the CLI often.

Default config file path:

```text
~/.config/siyuan-cli/config.json
```

Example:

```json
{
  "defaultProfile": "local",
  "profiles": {
    "local": {
      "baseUrl": "http://127.0.0.1:6806",
      "token": "local-token",
      "timeout": 15000
    }
  }
}
```

Then run:

```bash
sy system version --json
```

### Configuration Rules

Optional environment variables:

- `SIYUAN_BASE_URL`
- `SIYUAN_TOKEN`
- `SIYUAN_TIMEOUT`
- `SIYUAN_PROFILE`

Global flags:

- `--base-url`
- `--timeout`
- `--profile`

Defaults:

- `SIYUAN_BASE_URL=http://127.0.0.1:6806`
- `SIYUAN_TIMEOUT=15000`

Configuration precedence:

1. explicit CLI flags for `baseUrl`, `timeout`, and `profile`
2. environment variables
3. config file
4. built-in defaults

Token resolution precedence:

1. `SIYUAN_TOKEN`
2. config file profile token

Blank environment variable values are treated as unset and fall back to the next source.

## Available Commands

Implemented subcommands today:

- `system version`
- `system boot-progress`
- `system time`
- `notebook list`
- `notebook create`
- `notebook open`
- `notebook close`
- `doc create`
- `doc rename`
- `doc move`
- `doc remove`
- `doc export-md`
- `doc resolve-path`
- `block get`
- `block children`
- `block append`
- `block prepend`
- `block insert-before`
- `block insert-after`
- `block update`
- `block remove`
- `attr get`
- `attr set`
- `tag list`
- `tag rename`
- `tag remove`
- `tag set-doc`
- `ref refresh`
- `ref backlinks`
- `ref doc-backlinks`
- `ref doc-backmentions`
- `ref transfer`
- `graph global`
- `graph local`
- `graph reset`
- `sql query`
- `sql explain-safety`
- `workflow doc-upsert`
- `workflow block-batch`
- `workflow sql-report`

## JSON Mode

Every implemented command supports `--json`.

Success shape:

```json
{
  "ok": true,
  "command": "system.version",
  "data": "3.1.0",
  "meta": {
    "duration_ms": 12
  }
}
```

Failure shape:

```json
{
  "ok": false,
  "command": "sql.query",
  "error": {
    "code": "SQL_UNSAFE",
    "message": "Only SELECT read-only queries are allowed",
    "details": {}
  }
}
```

## REPL

Start the interactive shell:

```bash
sy repl
```

Exit with `exit` or `quit`.

The REPL forwards normal CLI commands and supports context inheritance for common doc and block flags (`--notebook`, `--path`, `--id`, `--parent-id`), so you can avoid repeating them in consecutive commands.

Built-in REPL helpers:

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

`doc resolve-path` accepts either of these path styles:

- the stored SiYuan `hpath`, such as `/Projects/Doc`
- the same path with a leading notebook segment, such as `/Notebook/Projects/Doc`

## Current Limitations

- REPL context injection covers only common doc and block flags; it is not a general-purpose shell layer.
- Offline or unhealthy targets return structured `API_*` failures, but the command still exits non-zero.

## Acknowledgements

This project was built with reference to the SiYuan repository and the SiYuan API documentation:

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
