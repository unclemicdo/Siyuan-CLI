import { Command } from "commander";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface SkillCommandDeps {
  write: (value: string) => boolean;
}

type InstallMode = "link" | "copy";

interface InstallOptions {
  targetDir?: string;
  mode?: string;
  force?: boolean;
}

/**
 * Registers `sy skill install`.
 *
 * Works both from an npm-installed package (`dist/commands/skill.js`, skill
 * shipped under `<package>/skills/`) and from the repository working tree
 * (`src/commands/skill.js` under tsx, skill at `<repo>/skills/`).
 */
export function registerSkillCommands(
  program: Command,
  deps: SkillCommandDeps
): void {
  const skill = program
    .command("skill")
    .description("Manage the bundled siyuan-cli agent skill");

  skill
    .command("install")
    .description(
      "Install the bundled siyuan-cli skill into an agent skills directory (~/.claude/skills or ~/.codex/skills)"
    )
    .option(
      "--target-dir <dir>",
      "Agent skill root, e.g. ~/.claude/skills or ~/.codex/skills"
    )
    .option(
      "--mode <mode>",
      "Install mode: link (symlink, default) or copy",
      "link"
    )
    .option("--force", "Replace an existing installation", false)
    .action(async (options: InstallOptions) => {
      installSkill(options, deps);
    });
}

function installSkill(options: InstallOptions, deps: SkillCommandDeps): void {
  const sourceDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "skills",
    "siyuan-cli"
  );

  if (!existsSync(sourceDir)) {
    fail(`Skill source directory not found: ${sourceDir}`);
  }

  let mode: InstallMode;
  if (options.mode === "link" || options.mode === "symlink") {
    mode = "link";
  } else if (options.mode === "copy") {
    mode = "copy";
  } else {
    fail(`Unsupported mode: ${options.mode ?? "(empty)"}. Use link or copy.`);
  }

  const targetDir = resolveTargetDir(options.targetDir);
  const targetPath = join(targetDir, "siyuan-cli");

  if (existsSync(targetPath) || isSymlinkPath(targetPath)) {
    if (!options.force) {
      fail(
        `Target already exists: ${targetPath}. Re-run with --force to replace it.`
      );
    }

    rmSync(targetPath, { recursive: true, force: true });
  }

  mkdirSync(targetDir, { recursive: true });

  if (mode === "link") {
    symlinkSync(sourceDir, targetPath, "dir");
  } else {
    cpSync(sourceDir, targetPath, { recursive: true });
  }

  deps.write(`${mode} installed: ${targetPath} -> ${sourceDir}\n`);
}

function resolveTargetDir(explicitTargetDir?: string): string {
  if (explicitTargetDir) {
    return resolve(explicitTargetDir);
  }

  const candidates = [
    join(homedir(), ".claude", "skills"),
    join(homedir(), ".codex", "skills")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function isSymlinkPath(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
