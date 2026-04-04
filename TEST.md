# Test Guide

## Fast Local Verification

Run the automated suite:

```bash
npm test -- --run
npm run build
```

This covers:

- core config and output contracts
- primitive command registration and JSON output
- SQL safety rules
- workflow helpers
- REPL state and command registration

## Focused Test Targets

```bash
npm test -- --run tests/test_core.spec.ts
npm test -- --run tests/commands/system.spec.ts
npm test -- --run tests/commands/sql.spec.ts
npm test -- --run tests/commands/primitives.spec.ts
npm test -- --run tests/workflows/doc-upsert.spec.ts
npm test -- --run tests/test_full_e2e.spec.ts
```

## Live SiYuan Gate

`tests/test_full_e2e.spec.ts` is intentionally gated behind live environment variables.

Set both variables to enable live smoke checks:

```bash
export SIYUAN_BASE_URL=http://127.0.0.1:6806
export SIYUAN_TOKEN=your-token
```

With both vars present, the file runs these commands in JSON mode:

```bash
node --import tsx src/index.ts system version --json
node --import tsx src/index.ts notebook list --json
```

Expected success behavior:

- both commands exit with status `0`
- JSON payloads are valid and contain `ok: true`
- `command` values are `system.version` and `notebook.list`

Expected failure behavior when live env is set but the target is unhealthy (bad URL, token, network):

- one or both smoke tests fail due to non-zero exit status or invalid JSON payload

If either `SIYUAN_BASE_URL` or `SIYUAN_TOKEN` is missing, live tests are skipped cleanly and the file still passes.

Scope note:

- this e2e file is env-gated by design for predictable local/CI behavior
- it is not an exhaustive proof of every valid live config path
- the CLI also supports live setup through flags, `~/.config/siyuan-cli/config.json`, and profile resolution; those modes are covered by other tests/manual smoke, not this file

## Config Resolution Checks

The config loader now supports:

- root flags like `--token` and `--profile`
- environment variables
- `~/.config/siyuan-cli/config.json`

Quick smoke:

```bash
npm run dev -- --token test-token --base-url http://127.0.0.1:1 system version --json
```

Expected behavior:

- command parses successfully
- output is structured JSON
- without a live server it should fail with `API_NETWORK_ERROR`, not `CONFIG_MISSING_TOKEN`

## Manual Smoke Commands

These are useful when a live SiYuan instance is available:

```bash
SIYUAN_TOKEN=your-token npm run dev -- system version --json
SIYUAN_TOKEN=your-token npm run dev -- notebook list --json
SIYUAN_TOKEN=your-token npm run dev -- workflow sql-report --stmt "SELECT id FROM blocks LIMIT 5" --json
printf '%s\n' 'exit' | SIYUAN_TOKEN=your-token npm run dev -- repl
```

Expected behavior:

- JSON mode writes valid JSON to `stdout`
- failures return structured `CONFIG_*`, `API_*`, `SQL_*`, or `VALIDATION_*` errors
- REPL starts with `sy>` and exits cleanly on `exit` or `quit`
