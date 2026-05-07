---
name: siyuan-cli
description: Use when an agent needs to use this repository's SiYuan or 思源 `sy` CLI to create or update notes, append to docs, resolve paths to ids, run SQL queries, choose between primitive and workflow commands, or diagnose structured CLI failures.
---

# Siyuan CLI

Use this skill when the user wants work done through this repository's `sy` CLI rather than through direct HTTP calls or MCP tools.

## Defaults

- Prefer direct CLI execution over REPL for agent work.
- Prefer `--json` unless the user explicitly wants human-formatted output.
- Validate configuration early when the task depends on a live SiYuan target.
- If global `sy ...` is installed and available, prefer using it directly.
- If global `sy ...` is not available, fall back to `npm run dev -- ...` from the repository root.
- Prefer workflow commands when they remove orchestration without hiding important behavior.
- Prefer `--markdown-file` or `--data-file` for multiline Markdown or structured block content.
- If the file was generated just for this run, add `--cleanup-input-file` so successful writes remove the temporary file.
- If a mutation target is given as a readable path rather than an id, resolve it before block-level writes.
- Treat destructive mutations such as `doc remove`, `block remove`, `tag remove`, and broad tag renames as confirmation-worthy unless the user intent is already explicit.

## Routing

- Read `references/command-selection.md` when choosing commands.
- Read `references/knowledge-management.md` when the task is about tags, backlinks, backmentions, graph queries, or block-ref migration.
- Read `references/recipes.md` when the task spans multiple CLI steps.
- Read `references/error-handling.md` when setup is uncertain or a command fails.
