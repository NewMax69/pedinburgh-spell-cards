// Диагностика страницы: консоль, ошибки, наличие карточек.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const url = process.argv[2] ?? "http://127.0.0.1:3000/";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9520 + Math.floor(Math.random() * 100);
const profile = `C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace\\.edge-cdp`;

const browser = spawn(
  EDGE,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,1200",
    "about:blank",
  ],
  { stdio: "ignore" }
);

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error("devtools did not start");
}

try {
  await waitForDevtools();
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === "Runtime.consoleAPICalled") {
      console.log(
        "CONSOLE",
        msg.params.type,
        msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 400)
      );
    } else if (msg.method === "Runtime.exceptionThrown") {
      console.log("EXCEPTION", msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description?.slice(0, 600));
    } else if (msg.method === "Log.entryAdded") {
      console.log("LOG", msg.params.entry.level, msg.params.entry.text.slice(0, 400));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Page.navigate", { url });
  await sleep(5000);

  const result = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      cards: document.querySelectorAll('.spell-card').length,
      tiles: document.querySelectorAll('article').length,
      scaled: document.querySelectorAll('[style*="aspect-ratio"]').length,
      next: !!window.next,
      bodyLen: document.body.innerHTML.length,
      firstTile: document.querySelector('article')?.innerHTML.slice(0, 200) ?? null
    })`,
    returnByValue: true,
  });
  console.log("RESULT", result.result.value);

  const scriptFile = process.argv[3];
  if (scriptFile) {
    const { readFileSync } = await import("node:fs");
    const evalResult = await send("Runtime.evaluate", {
      expression: readFileSync(scriptFile, "utf8"),
      returnByValue: true,
      awaitPromise: true,
    });
    console.log("EVAL", JSON.stringify(evalResult.result.value), evalResult.exceptionDetails?.text ?? "");
  }
  ws.close();
} catch (error) {
  console.error("probe failed:", error);
} finally {
  browser.kill();
}
