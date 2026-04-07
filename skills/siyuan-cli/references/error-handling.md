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

## When to stop and ask the user

- when the target path or notebook is ambiguous
- when the user intent could imply destructive mutation
- when repeated API failures suggest the target instance itself is unhealthy
