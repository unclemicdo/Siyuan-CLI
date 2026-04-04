import readline from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

export interface ReplStateSnapshot {
  profile?: string;
  notebook?: string;
  doc?: string;
}

export interface HandleReplLineInput {
  state: ReturnType<typeof createReplState>;
  runCommand: (argv: string[]) => Promise<void>;
  write: (value: string) => void;
  resolveDocContext?: (doc: string) => Promise<{ id: string } | null>;
}

export function createReplState(initial: ReplStateSnapshot = {}) {
  let profile = initial.profile;
  let notebook = initial.notebook;
  let doc = initial.doc;

  return {
    setProfile(next?: string) {
      profile = next;
    },
    useNotebook(next: string) {
      notebook = next;
    },
    useDoc(next: string) {
      doc = next;
    },
    snapshot(): ReplStateSnapshot {
      return { profile, notebook, doc };
    }
  };
}

export async function startRepl(
  runCommand: (argv: string[]) => Promise<void>,
  options: {
    input?: Readable;
    output?: Writable;
    prompt?: string;
    state?: ReturnType<typeof createReplState>;
    resolveDocContext?: (doc: string) => Promise<{ id: string } | null>;
  } = {}
): Promise<void> {
  const state = options.state ?? createReplState();
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const prompt = options.prompt ?? "sy> ";
  const rl = readline.createInterface({
    input,
    output
  });

  try {
    if (isTtyInput(input)) {
      while (true) {
        const line = (await rl.question(prompt)).trim();
        if (!line || line === "exit" || line === "quit") {
          break;
        }

        await handleReplLine(line, {
          state,
          runCommand,
          resolveDocContext: options.resolveDocContext,
          write: (value) => {
            output.write(value);
          }
        });
      }
      return;
    }

    for await (const line of rl) {
      output.write(prompt);
      const trimmed = line.trim();
      if (!trimmed || trimmed === "exit" || trimmed === "quit") {
        break;
      }

      await handleReplLine(line, {
        state,
        runCommand,
        resolveDocContext: options.resolveDocContext,
        write: (value) => {
          output.write(value);
        }
      });
    }
  } finally {
    rl.close();
  }
}

function isTtyInput(input: Readable): boolean {
  return "isTTY" in input && Boolean((input as Readable & { isTTY?: boolean }).isTTY);
}

export async function handleReplLine(
  line: string,
  input: HandleReplLineInput
): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  const tokens = trimmed.split(/\s+/);
  const [command, subcommand, ...rest] = tokens;

  if (command === "profile") {
    input.state.setProfile(subcommand);
    return;
  }

  if (command === "use" && subcommand === "notebook" && rest[0]) {
    input.state.useNotebook(rest.join(" "));
    return;
  }

  if (command === "use" && subcommand === "doc" && rest[0]) {
    input.state.useDoc(rest.join(" "));
    return;
  }

  if (command === "context") {
    input.write(`${JSON.stringify(input.state.snapshot())}\n`);
    return;
  }

  await input.runCommand(await applyReplContext(tokens, input));
}

async function applyReplContext(
  tokens: string[],
  input: HandleReplLineInput
): Promise<string[]> {
  const snapshot = input.state.snapshot();
  const [command, subcommand] = tokens;
  const next = [...tokens];

  if (snapshot.profile && !hasOption(next, "--profile")) {
    next.unshift(snapshot.profile);
    next.unshift("--profile");
  }

  if (command === "workflow" && subcommand === "doc-upsert") {
    if (snapshot.notebook && !hasOption(next, "--notebook")) {
      next.push("--notebook", snapshot.notebook);
    }
    if (snapshot.doc && !hasOption(next, "--path")) {
      next.push("--path", snapshot.doc);
    }
    return next;
  }

  if (command === "doc") {
    if (subcommand === "create" && snapshot.notebook && !hasOption(next, "--notebook")) {
      next.push("--notebook", snapshot.notebook);
    }

    if (
      ["export-md", "remove", "rename"].includes(subcommand) &&
      snapshot.doc &&
      !hasOption(next, "--id")
    ) {
      const resolvedDocId = await resolveDocId(snapshot.doc, input.resolveDocContext);
      if (resolvedDocId) {
        next.push("--id", resolvedDocId);
      }
    }

    if (subcommand === "resolve-path" && snapshot.doc && !hasOption(next, "--path")) {
      next.push("--path", snapshot.doc);
    }

    return next;
  }

  if (command !== "block" || !snapshot.doc) {
    return next;
  }

  const resolvedDocId = await resolveDocId(snapshot.doc, input.resolveDocContext);
  if (!resolvedDocId) {
    return next;
  }

  if (
    ["get", "children", "update", "remove"].includes(subcommand) &&
    !hasOption(next, "--id")
  ) {
    next.push("--id", resolvedDocId);
    return next;
  }

  if (
    ["append", "prepend"].includes(subcommand) &&
    !hasOption(next, "--parent-id")
  ) {
    next.push("--parent-id", resolvedDocId);
  }

  return next;
}

function hasOption(tokens: string[], option: string): boolean {
  return tokens.includes(option);
}

async function resolveDocId(
  doc: string,
  resolveDocContext?: (doc: string) => Promise<{ id: string } | null>
): Promise<string | undefined> {
  if (!resolveDocContext) {
    return doc;
  }

  const resolved = await resolveDocContext(doc);
  return resolved?.id;
}
