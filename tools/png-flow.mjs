// Проверка PNG-экспорта: открывает редактор с карточкой, жмёт «PNG», ждёт файл.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = "C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace";
const DOWNLOADS = `${ROOT}\\ref\\downloads-png`;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9820 + Math.floor(Math.random() * 100);
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";

rmSync(DOWNLOADS, { recursive: true, force: true });
mkdirSync(DOWNLOADS, { recursive: true });

const browser = spawn(
  EDGE,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${ROOT}\\.edge-cdp`,
    "--window-size=1440,1200",
    "about:blank",
  ],
  { stdio: "ignore" }
);

let ws;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
    } catch {}
    await sleep(200);
  }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
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
    } else if (msg.method === "Runtime.exceptionThrown") {
      console.log("EXCEPTION", msg.params.exceptionDetails.exception?.description?.slice(0, 500));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: DOWNLOADS,
    eventsEnabled: true,
  });

  await send("Page.navigate", { url: `${BASE}/` });
  await sleep(3000);
  const seed = readFileSync(`${ROOT}\\tools\\seed-check.js`, "utf8");
  await send("Runtime.evaluate", { expression: seed, awaitPromise: true });

  await send("Page.navigate", { url: `${BASE}/editor?id=custom-check` });
  await sleep(5000);

  const click = await send("Runtime.evaluate", {
    expression: `(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='PNG'); if(!b) return 'no button'; b.click(); return 'clicked'; })()`,
    returnByValue: true,
  });
  console.log("CLICK", click.result.value);

  let file = null;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const files = existsSync(DOWNLOADS) ? readdirSync(DOWNLOADS).filter((f) => f.endsWith(".png")) : [];
    if (files.length) {
      file = files[0];
      break;
    }
  }
  if (file) {
    const { statSync } = await import("node:fs");
    const size = statSync(`${DOWNLOADS}\\${file}`).size;
    console.log(`DOWNLOADED ${file} ${size} bytes`);
  } else {
    console.log("NO PNG");
  }
} catch (error) {
  console.error("png flow failed:", error);
  process.exitCode = 1;
} finally {
  try {
    ws?.close();
  } catch {}
  browser.kill();
}
