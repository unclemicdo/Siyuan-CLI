import http from "node:http";
import { execFile } from "node:child_process";

const requests = [];

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch {}
    requests.push({ method: req.method, url: req.url, body: parsed });
    let data = null;
    if (req.url === "/api/av/getAttributeViewKeysByAvID") {
      data = [{ id: "key-2", name: "Status", type: "select" }];
    } else if (req.url === "/api/transactions") {
      data = [];
    } else if (req.url === "/api/filetree/createDocWithMd") {
      data = "doc-new";
    } else if (req.url === "/api/av/addAttributeViewBlocks") {
      data = null;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ code: 0, msg: "", data }));
  });
});

const runCli = (args) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      ["--import", "tsx", "src/index.ts", ...args],
      {
        cwd: process.cwd(),
        env: { ...process.env, SIYUAN_BASE_URL: `http://127.0.0.1:${server.address().port}`, SIYUAN_TOKEN: "mock-token" },
        timeout: 20000,
      },
      (error, stdout, stderr) => resolve({ status: error ? (error.code ?? 1) : 0, stdout, stderr })
    );
  });

server.listen(0, "127.0.0.1", async () => {
  const cases = [
    ["av", "set-cell", "--av-id", "av-1", "--key-id", "key-1", "--item-id", "row-1", "--value", "hello", "--json"],
    ["av", "update-key", "--av-id", "av-1", "--key-id", "key-2", "--name", "Lifecycle", "--json"],
    ["av", "update-key", "--av-id", "av-1", "--key-id", "key-2", "--type", "number", "--json"],
    ["av", "update-key", "--av-id", "av-1", "--key-id", "key-2", "--name", "X", "--type", "text", "--json"],
    ["av", "update-key", "--av-id", "av-1", "--key-id", "key-2", "--icon", "iconTag", "--json"],
    ["doc", "create", "--notebook", "nb-1", "--path", "/Empty-Doc", "--json"],
    ["av", "add-detached-rows", "--av-id", "av-1", "--row-ids", "row-9", "--content", "New row", "--json"],
  ];

  const failures = [];
  for (const args of cases) {
    const r = await runCli(args);
    if (r.status !== 0) {
      failures.push({ args, stderr: r.stderr, stdout: r.stdout });
    }
  }

  const setCellReq = requests.find((r) => r.url === "/api/av/setAttributeViewBlockAttr");
  const keysReqs = requests.filter((r) => r.url === "/api/av/getAttributeViewKeysByAvID");
  const txReqs = requests.filter((r) => r.url === "/api/transactions");
  const createDocReq = requests.find((r) => r.url === "/api/filetree/createDocWithMd");
  const detachedReq = requests.find((r) => r.url === "/api/av/addAttributeViewBlocks");

  const checks = [];
  checks.push([
    "set-cell sends itemID",
    !!setCellReq && setCellReq.body.itemID === "row-1" && setCellReq.body.rowID === undefined,
  ]);
  checks.push([
    "update-key --name resolves type from keys first",
    keysReqs.length === 2 &&
      txReqs[0] &&
      txReqs[0].body.transactions[0].doOperations[0].action === "updateAttrViewCol" &&
      txReqs[0].body.transactions[0].doOperations[0].name === "Lifecycle" &&
      txReqs[0].body.transactions[0].doOperations[0].type === "select",
  ]);
  checks.push([
    "update-key --type resolves name from keys first",
    txReqs[1] &&
      txReqs[1].body.transactions[0].doOperations[0].action === "updateAttrViewCol" &&
      txReqs[1].body.transactions[0].doOperations[0].name === "Status" &&
      txReqs[1].body.transactions[0].doOperations[0].type === "number",
  ]);
  checks.push([
    "update-key with name+type skips keys lookup and sends both",
    keysReqs.length === 2 &&
      txReqs[2] &&
      txReqs[2].body.transactions[0].doOperations[0].name === "X" &&
      txReqs[2].body.transactions[0].doOperations[0].type === "text",
  ]);
  checks.push([
    "update-key --icon sends only setAttrViewColIcon without keys lookup",
    keysReqs.length === 2 &&
      txReqs[3] &&
      txReqs[3].body.transactions[0].doOperations.length === 1 &&
      txReqs[3].body.transactions[0].doOperations[0].action === "setAttrViewColIcon" &&
      txReqs[3].body.transactions[0].doOperations[0].data === "iconTag",
  ]);
  checks.push([
    "doc create sends explicit empty markdown",
    !!createDocReq && createDocReq.body.markdown === "" && createDocReq.body.path === "/Empty-Doc",
  ]);
  checks.push([
    "add-detached-rows sends itemID and content",
    !!detachedReq &&
      detachedReq.body.srcs[0].itemID === "row-9" &&
      detachedReq.body.srcs[0].isDetached === true &&
      detachedReq.body.srcs[0].content === "New row" &&
      detachedReq.body.srcs[0].id === undefined,
  ]);
  checks.push(["all CLI invocations exit 0", failures.length === 0]);

  let ok = true;
  for (const [name, pass] of checks) {
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) ok = false;
  }
  if (failures.length) {
    console.log("CLI failures:", JSON.stringify(failures, null, 2));
  }
  server.close();
  process.exit(ok ? 0 : 1);
});
