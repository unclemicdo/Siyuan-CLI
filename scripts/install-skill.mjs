#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { cpSync, existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(repoRoot, "skills", "siyuan-cli");

if (!existsSync(sourceDir)) {
  fail(`Skill source directory not found: ${sourceDir}`);
}

const targetDir = resolveTargetDir(args.targetDir);
const targetPath = join(targetDir, "siyuan-cli");
const mode = args.mode ?? "symlink";

mkdirSync(targetDir, { recursive: true });

if (existsSync(targetPath) || isSymlinkPath(targetPath)) {
  if (!args.force) {
    fail(
      `Target already exists: ${targetPath}. Re-run with --force to replace it.`
    );
  }

  rmSync(targetPath, { recursive: true, force: true });
}

if (mode === "symlink") {
  symlinkSync(sourceDir, targetPath, "dir");
} else if (mode === "copy") {
  cpSync(sourceDir, targetPath, { recursive: true });
} else {
  fail(`Unsupported mode: ${mode}`);
}

process.stdout.write(
  `${mode} installed: ${targetPath} -> ${sourceDir}\n`
);

function parseArgs(argv) {
  const parsed = {
    mode: undefined,
    targetDir: undefined,
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") {
      parsed.mode = readRequiredArg(argv, index, "--mode");
      index += 1;
      continue;
    }

    if (value === "--target-dir") {
      parsed.targetDir = readRequiredArg(argv, index, "--target-dir");
      index += 1;
      continue;
    }

    if (value === "--force") {
      parsed.force = true;
      continue;
    }

    if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }

    fail(`Unknown argument: ${value}`);
  }

  return parsed;
}

function resolveTargetDir(explicitTargetDir) {
  if (explicitTargetDir) {
    return resolve(explicitTargetDir);
  }

  fail(
    "Missing required option: --target-dir. Pass a concrete skill root such as ~/.codex/skills or ~/.claude/skills."
  );
}

function isSymlinkPath(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function printHelp() {
  process.stdout.write(`Install the siyuan-cli skill from the repository source.

Usage:
  node scripts/install-skill.mjs [--mode symlink|copy] [--target-dir <dir>] [--force]

Defaults:
  --mode symlink
  --target-dir has no default; pass a concrete skill root such as ~/.codex/skills or ~/.claude/skills
`);
}

function readRequiredArg(argv, index, optionName) {
  const next = argv[index + 1];
  if (!next || next.startsWith("--")) {
    fail(`Missing value for ${optionName}`);
  }

  return next;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
