# Siyuan CLI

Agent-first TypeScript CLI for SiYuan Note.

The project exposes a small, structured command surface over SiYuan's HTTP API with stable JSON output for scripts and agents. It currently focuses on core primitives, a few workflow helpers, and a lightweight REPL.

## Requirements

- Node.js `>=22.10.0`
- A reachable SiYuan HTTP API endpoint
- A SiYuan API token

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run

```bash
SIYUAN_TOKEN=your-token npm run dev -- system version --json
```

Optional environment variables:

- `SIYUAN_BASE_URL`
- `SIYUAN_TOKEN`
- `SIYUAN_TIMEOUT`
- `SIYUAN_PROFILE`

Global flags:

- `--base-url`
- `--token`
- `--timeout`
- `--profile`

Defaults:

- `SIYUAN_BASE_URL=http://127.0.0.1:6806`
- `SIYUAN_TIMEOUT=15000`

Configuration precedence:

1. explicit CLI flags
2. environment variables
3. config file
4. built-in defaults

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

## Current Command Surface

Top-level commands:

- `system`
- `notebook`
- `doc`
- `block`
- `attr`
- `sql`
- `workflow`
- `repl`

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
  "data": {
    "version": "3.1.0"
  },
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

## Examples

```bash
SIYUAN_TOKEN=your-token npm run dev -- notebook list --json
SIYUAN_TOKEN=your-token npm run dev -- doc create --notebook nb-1 --path /Projects/Siyuan-CLI --markdown "# Hello" --json
SIYUAN_TOKEN=your-token npm run dev -- block append --parent-id doc-1 --data "Follow-up note" --json
SIYUAN_TOKEN=your-token npm run dev -- sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
SIYUAN_TOKEN=your-token npm run dev -- workflow sql-report --stmt "SELECT id FROM blocks LIMIT 5" --json
printf '%s\n' 'exit' | SIYUAN_TOKEN=your-token npm run dev -- repl
```

## REPL

Start the interactive shell:

```bash
SIYUAN_TOKEN=your-token npm run dev -- repl
```

Exit with `exit` or `quit`.

The current REPL is intentionally thin. It forwards normal CLI commands and does not add a separate DSL.

## Tests

```bash
npm test -- --run
```

Live-environment notes are documented in [TEST.md](/Users/michael/vibe_coding_pj/claude_code_pj/build-mcp/Siyuan-CLI/TEST.md).
