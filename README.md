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

The current REPL is intentionally thin. It forwards normal CLI commands and adds only a small amount of context-aware flag injection.

Built-in REPL helpers:

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

Current context injection is intentionally narrow:

- `workflow doc-upsert` can inherit `--notebook` and `--path`
- `doc create` can inherit `--notebook`
- `doc export-md`, `doc remove`, and `doc rename` can inherit `--id`
- `doc resolve-path` can inherit `--path`
- `block get`, `block children`, `block update`, and `block remove` can inherit `--id`
- `block append` and `block prepend` can inherit `--parent-id`

Other commands remain plain passthrough and must be given explicit flags.

`doc resolve-path` now accepts either of these path styles:

- the stored SiYuan `hpath`, such as `/Projects/Doc`
- the same path with a leading notebook segment, such as `/Notebook/Projects/Doc`

## Current Limitations

- Live end-to-end coverage is still environment-gated and currently proves only `system version` and `notebook list`.
- REPL context injection covers only the command/flag pairs listed above; it is not a general-purpose shell layer.
- Offline or unhealthy targets return structured `API_*` failures, but the command still exits non-zero.

## Tests

```bash
npm test -- --run
```

`tests/test_full_e2e.spec.ts` is a gated live smoke file.

- Current gate condition is environment-based: it runs only when both `SIYUAN_BASE_URL` and `SIYUAN_TOKEN` are set in the test process.
- When set, it executes:
  - `node --import tsx src/index.ts system version --json`
  - `node --import tsx src/index.ts notebook list --json`
- It asserts both commands exit `0` and return valid JSON with `ok: true` and commands `system.version` and `notebook.list`.
- This file does not prove every live config mode. The CLI also supports flags/config-file/profile resolution for live setup; those paths are intentionally out of scope for this env-gated smoke.
- When either env var is missing, live checks are skipped cleanly.

Live-environment details are documented in [TEST.md](/Users/michael/vibe_coding_pj/claude_code_pj/build-mcp/Siyuan-CLI/TEST.md).
