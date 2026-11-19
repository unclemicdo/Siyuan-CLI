#!/usr/bin/env node
/**
 * Live end-to-end checks for the 0.2.x audit fixes against a running SiYuan kernel.
 * Invokes the installed `sy` CLI (not unit mocks).
 */
import { spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SY = process.env.SY_BIN || "sy";
const MARK = `sy-e2e-${Date.now()}`;
const WORKSPACE = process.env.SIYUAN_WORKSPACE || "/Users/michael/SiYuan/AI-cowork";
const TEMPLATE_PATH = join(WORKSPACE, "data/templates/test.md");
const NOTEBOOK_ID = process.env.SIYUAN_E2E_NOTEBOOK || "20260519173642-hy72hxx"; // 工作台
const DOC_PATH = `/sy-cli-e2e/${MARK}`;
const AV_ID = process.env.SIYUAN_E2E_AV_ID || "20260523164728-petzmf2";
const AV_BLOCK_ID = process.env.SIYUAN_E2E_AV_BLOCK_ID || "20260610232150-zsj77gi";
const KNOWN_DOC = process.env.SIYUAN_E2E_KNOWN_DOC || "20260507194828-41jyrbw";

const results = [];
let createdDocId = null;
const managedName = `${MARK}.json`;
const inputDir = join(process.cwd(), `.${MARK}-inputs`);

function record(name, ok, detail = "") {
  results.push({ name, ok, detail: String(detail).slice(0, 240) });
  const mark = ok ? "PASS" : "FAIL";
  process.stdout.write(`${mark}  ${name}${detail ? ` — ${String(detail).slice(0, 160)}` : ""}\n`);
}

function runSy(args, { expectOk = true, stdin = null } = {}) {
  const res = spawnSync(SY, args, {
    encoding: "utf8",
    input: stdin ?? undefined,
    env: process.env,
    maxBuffer: 8 * 1024 * 1024
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  let json = null;
  try {
    json = JSON.parse(out.split("\n").filter(Boolean).at(-1) || "");
  } catch {
    json = null;
  }
  return { res, out, json, code: res.status ?? 1 };
}

function expectJsonOk(name, args, opts = {}) {
  const { res, out, json } = runSy([...args, "--json"], opts);
  if (!json) {
    record(name, false, `non-json output: ${out.slice(0, 160)}`);
    return null;
  }
  const ok = json.ok === true;
  if (opts.expectOk === false) {
    record(name, json.ok === false, json.error?.code || json.error?.message || out.slice(0, 160));
    return json;
  }
  record(name, ok, ok ? summarize(json.data) : `${json.error?.code}: ${json.error?.message}`);
  return ok ? json : null;
}

function summarize(data) {
  if (data == null) return "null";
  if (typeof data === "string") return data.slice(0, 80);
  if (Array.isArray(data)) return `array(len=${data.length})`;
  if (typeof data === "object") {
    const keys = Object.keys(data);
    return `object{${keys.slice(0, 6).join(",")}${keys.length > 6 ? ",…" : ""}}`;
  }
  return String(data).slice(0, 80);
}

function cleanup() {
  try {
    if (createdDocId) {
      runSy(["doc", "remove", "--id", createdDocId, "--force", "--json"]);
    }
  } catch {
    // ignore
  }
  try {
    runSy(["file", "remove", "--scope", "cache", "--name", managedName, "--force", "--json"]);
  } catch {
    // ignore
  }
  rmSync(inputDir, { recursive: true, force: true });
}

async function main() {
  mkdirSync(inputDir, { recursive: true });

  // --- Preflight ---
  {
    const ver = expectJsonOk("preflight.system.version", ["system", "version"]);
    if (!ver) {
      process.exitCode = 1;
      return;
    }
  }

  // --- file managed paths (~/.cache/sy-cli) ---
  {
    const contentFile = join(inputDir, "cache.json");
    writeFileSync(contentFile, JSON.stringify({ mark: MARK }), "utf8");
    const put = expectJsonOk("file.put-cache", [
      "file",
      "put-cache",
      "--name",
      managedName,
      "--content-file",
      contentFile,
      "--overwrite"
    ]);
    const expectedPath = join(homedir(), ".cache", "sy-cli", "cache", managedName);
    const putPath = put?.data?.path;
    record(
      "file.put-cache.path-under-xdg-cache",
      typeof putPath === "string" && putPath === expectedPath,
      putPath || "missing path"
    );
    expectJsonOk("file.get.cache", [
      "file",
      "get",
      "--scope",
      "cache",
      "--name",
      managedName
    ]);
    expectJsonOk("file.list.cache", ["file", "list", "--scope", "cache"]);
    expectJsonOk("file.remove.cache", [
      "file",
      "remove",
      "--scope",
      "cache",
      "--name",
      managedName,
      "--force"
    ]);
    record("file.removed.from-disk", !existsSync(expectedPath), expectedPath);
  }

  // --- path resolution (official filetree APIs) ---
  {
    expectJsonOk("path.resolve.notebook-prefixed", [
      "doc",
      "resolve-path",
      "--path",
      "/AI-partner-doc/01拆分计划"
    ]);
    expectJsonOk("path.doc-id.known", [
      "path",
      "doc-id",
      "--path",
      "/01拆分计划"
    ]);
  }

  // --- create doc + append + sql flush visibility ---
  {
    const create = expectJsonOk("doc.create.e2e", [
      "doc",
      "create",
      "--notebook",
      NOTEBOOK_ID,
      "--path",
      DOC_PATH
    ], { stdin: `# ${MARK}\n` });
    createdDocId = typeof create?.data === "string" ? create.data : create?.data?.id;
    record("doc.create.got-id", Boolean(createdDocId), createdDocId || "missing");

    if (createdDocId) {
      const unique = `E2E_FLUSH_MARKER_${MARK}`;
      expectJsonOk("block.append.marker", [
        "block",
        "append",
        "--parent-id",
        createdDocId
      ], { stdin: unique });

      // Immediately query without flush (informational; may pass or fail depending on race)
      const before = runSy([
        "sql",
        "query",
        "--stmt",
        `SELECT id, content FROM blocks WHERE content LIKE '%${unique}%' LIMIT 5`,
        "--json"
      ]);
      const beforeHit = Array.isArray(before.json?.data) && before.json.data.length > 0;
      record(
        "sql.query.before-flush.observed-or-raced",
        true,
        beforeHit ? "already-visible" : "not-yet-visible"
      );

      expectJsonOk("sql.flush", ["sql", "flush"]);

      const after = expectJsonOk("sql.query.after-flush", [
        "sql",
        "query",
        "--stmt",
        `SELECT id, content FROM blocks WHERE content LIKE '%${unique}%' LIMIT 5`
      ]);
      const afterHit = Array.isArray(after?.data) && after.data.length > 0;
      record("sql.flush.makes-write-visible", afterHit, afterHit ? `rows=${after.data.length}` : "no rows after flush");

      const resolved = expectJsonOk("path.resolve.created-doc", [
        "doc",
        "resolve-path",
        "--path",
        `/工作台${DOC_PATH}`
      ]);
      record(
        "path.resolve.created-doc.matches",
        resolved?.data?.id === createdDocId,
        `${resolved?.data?.id} vs ${createdDocId}`
      );
    }
  }

  // --- AV public endpoint wiring ---
  {
    expectJsonOk("av.search.keyword", ["av", "search", "--keyword", "管线"]);
    expectJsonOk("av.primary-values", [
      "av",
      "primary-values",
      "--id",
      AV_ID,
      "--page-size",
      "3"
    ]);
    expectJsonOk("av.relation-keys", ["av", "relation-keys", "--id", AV_ID]);
    expectJsonOk("av.filter-sort", [
      "av",
      "filter-sort",
      "--id",
      AV_ID,
      "--block-id",
      AV_BLOCK_ID
    ]);
    expectJsonOk("av.keys", ["av", "keys", "--id", AV_ID]);

    // set-name idempotent
    const avGet = expectJsonOk("av.get.before-set-name", ["av", "get", "--id", AV_ID]);
    const avName = avGet?.data?.av?.name || "管线追踪";
    expectJsonOk("av.set-name.idempotent", [
      "av",
      "set-name",
      "--av-id",
      AV_ID,
      "--name",
      avName
    ]);

    // update-key idempotent on a non-block key if present
    const keys = expectJsonOk("av.keys.for-update", ["av", "keys", "--id", AV_ID]);
    const keyList = Array.isArray(keys?.data) ? keys.data : [];
    const key = keyList.find((k) => k?.type && k.type !== "block") || keyList[0];
    if (key?.id && key?.name && key?.type) {
      expectJsonOk("av.update-key.idempotent", [
        "av",
        "update-key",
        "--av-id",
        AV_ID,
        "--key-id",
        key.id,
        "--name",
        key.name,
        "--type",
        key.type
      ]);
    } else {
      record("av.update-key.idempotent", false, "no key available");
    }
  }

  // --- ref backlinks / getBacklink2 ---
  {
    expectJsonOk("ref.backlinks", ["ref", "backlinks", "--id", KNOWN_DOC]);
    expectJsonOk("ref.backlinks.sort", [
      "ref",
      "backlinks",
      "--id",
      KNOWN_DOC,
      "--sort",
      "0",
      "--mention-sort",
      "0"
    ]);
    const legacy = runSy([
      "ref",
      "backlinks",
      "--id",
      KNOWN_DOC,
      "--before-len",
      "12",
      "--json"
    ]);
    record(
      "ref.backlinks.rejects-removed-before-len",
      legacy.code !== 0 || legacy.json?.ok === false || /unknown option/.test(legacy.out),
      legacy.out.slice(0, 120)
    );
  }

  // --- template render mode / token ---
  {
    if (!existsSync(TEMPLATE_PATH)) {
      record("template.render.preview", false, `missing template file ${TEMPLATE_PATH}`);
    } else {
      expectJsonOk("template.render.preview-flag", [
        "template",
        "render",
        "--id",
        KNOWN_DOC,
        "--path",
        TEMPLATE_PATH,
        "--preview"
      ]);
      expectJsonOk("template.render.mode-preview", [
        "template",
        "render",
        "--id",
        KNOWN_DOC,
        "--path",
        TEMPLATE_PATH,
        "--mode",
        "preview"
      ]);
      // editorInsert without a real interactive token should fail at kernel with structured error
      const insert = runSy([
        "template",
        "render",
        "--id",
        KNOWN_DOC,
        "--path",
        TEMPLATE_PATH,
        "--mode",
        "editorInsert",
        "--http-confirm-token",
        "invalid-e2e-token",
        "--json"
      ]);
      record(
        "template.render.mode-editorInsert.accepts-flags",
        Boolean(insert.json) && (insert.json.ok === true || insert.json.ok === false),
        insert.json?.ok
          ? "ok"
          : `${insert.json?.error?.code}: ${insert.json?.error?.message}`
      );
    }

    const conflict = runSy([
      "template",
      "render",
      "--id",
      KNOWN_DOC,
      "--path",
      TEMPLATE_PATH,
      "--preview",
      "--mode",
      "editorInsert",
      "--json"
    ]);
    record(
      "template.render.rejects-preview-mode-conflict",
      conflict.json?.ok === false &&
        conflict.json?.error?.code === "VALIDATION_CONFLICTING_OPTIONS",
      conflict.json?.error?.code || conflict.out.slice(0, 120)
    );
  }

  // --- cleanup created doc ---
  if (createdDocId) {
    expectJsonOk("doc.remove.cleanup", [
      "doc",
      "remove",
      "--id",
      createdDocId,
      "--force"
    ]);
    createdDocId = null;
  }

  const failed = results.filter((r) => !r.ok);
  process.stdout.write("\n=== E2E SUMMARY ===\n");
  process.stdout.write(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}\n`);
  if (failed.length) {
    for (const f of failed) {
      process.stdout.write(`FAIL  ${f.name} — ${f.detail}\n`);
    }
    process.exitCode = 1;
  } else {
    process.stdout.write("ALL PASS\n");
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    cleanup();
  });
