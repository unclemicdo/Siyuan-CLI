export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  return new Promise<string>((resolve) => {
    let buffer = "";
    let settled = false;

    const finish = () => {
      if (!settled) {
        settled = true;
        clearTimeout(safety);
        resolve(buffer);
      }
    };

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);

    // Safety: non-TTY stdin with no data (e.g. open pipe) should not hang forever.
    // The first data chunk arrives within ms when real data is piped.
    const safety = setTimeout(() => {
      if (buffer.length === 0) {
        // An open pipe with no data (script/CI spawn) must not keep the process alive.
        process.stdin.unref();
        finish();
      }
    }, 500);
  });
}
