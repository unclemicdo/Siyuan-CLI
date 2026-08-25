# Error Handling

## Diagnose in this order

1. Configuration
2. Connectivity
3. Command semantics
4. Query safety or user input

## `CONFIG_*`

- `CONFIG_MISSING_TOKEN`: token is missing from environment or config profile.
- `CONFIG_INVALID_BASE_URL`: base URL is malformed or not `http(s)`.
- `CONFIG_INVALID_TIMEOUT`: timeout is missing, non-numeric, or non-positive.
- `CONFIG_INVALID_FILE`: the config file exists but cannot be parsed.

Action:

- fix config first
- rerun a minimal preflight command like `sy system version --json`
- if `sy` is not installed, use `npm run dev -- system version --json` from the repository root

## `API_*`

- `API_NETWORK_ERROR`: target is unreachable, refused, timed out, or otherwise unavailable
- `API_RESPONSE_ERROR`: SiYuan returned a structured failure
- `API_INVALID_RESPONSE`: the response did not match the expected contract

Action:

- confirm base URL
- confirm target health
- retry only after configuration and service reachability are known good

## `SQL_*`

- `SQL_UNSAFE`: query is not read-only

Action:

- narrow the query to `SELECT`-only
- do not retry mutation SQL through `sql query`

## `VALIDATION_*`

- `unknown option`: command spelling or flags do not match the current CLI
- `VALIDATION_MISSING_INPUT`: no `--data-file`, `--markdown-file`, `--content-file`, `--append-file`, `--template-file`, or stdin content was provided
- `VALIDATION_CONFLICTING_OPTIONS`: mutually exclusive flags were passed together
- `VALIDATION_INVALID_JSON`: structured JSON input such as `--attrs`, `--operations`, or `--conf` is malformed
- `VALIDATION_FILE_READ_FAILED`: the referenced input file does not exist or cannot be read
- `VALIDATION_FILE_DELETE_FAILED`: a requested cleanup step could not delete the temporary input file
- `VALIDATION_INVALID_OPTION`: a flag value is syntactically valid but semantically unsupported, such as a non-absolute `template render --path` or unsupported `file --scope`
- `VALIDATION_UNSUPPORTED_OPTION`: the command intentionally rejects a flag, such as `template render-sprig --var`
- `VALIDATION_MISSING_OPTION`: a required safety flag such as `file remove --force` was omitted

Action:

- confirm the command and subcommand name first
- confirm flags against the current repository command implementation
- if global `sy ...` is unavailable, retry through `npm run dev -- ...` only from the repository root
- if the task uses structured input files, check that the path exists and that the file was meant to be ephemeral before retrying cleanup
- in sandboxed agent environments, treat `VALIDATION_FILE_READ_FAILED` on `/tmp` or `$TMPDIR` inputs as a path-visibility problem first; rewrite the file under the current working directory, switch to an absolute path, and retry there

## Command-specific traps

- `template render` failing with a message like "must be an absolute workspace path" means the agent passed an hpath or relative path. Retry with a real filesystem absolute `.sy` path inside the workspace.
- `template render-sprig` failing on `--var` or `--vars` is expected. Remove those flags instead of retrying.
- repeated `VALIDATION_FILE_READ_FAILED` on generated multiline input files usually means the agent kept retrying the same unreachable temp path pattern. Stop retrying `/tmp` or `$TMPDIR` variants and move the file into the current working directory instead.
- `export resources` failing on a document that has no asset refs is not a transport error. Check whether the source document actually contains asset links.
- `file.get`, `file.list`, or `file.remove` failures on scope usually mean the agent used a non-managed scope. Allowed scopes are `cache`, `export`, and `report`.
- `av set-cell` failures often come from a mismatched `key-id`, `item-id`, or wrong `--value-type` for the destination column.
- `npm run dev -- ...` failures from outside the repo usually mean the agent used the repo-local fallback from the wrong working directory.

## When to stop and ask the user

- when the target path or notebook is ambiguous
- when the user intent could imply destructive mutation
- when repeated API failures suggest the target instance itself is unhealthy
