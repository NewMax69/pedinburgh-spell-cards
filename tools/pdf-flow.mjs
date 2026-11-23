// Прогон печати: выбирает карточки, открывает /print, жмёт «Скачать PDF» и ждёт файл.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = "C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace";
const DOWNLOADS = `${ROOT}\\ref\\downloads`;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9720 + Math.floor(Math.random() * 100);

const snapshot = JSON.parse(readFileSync(`${ROOT}\\data\\spells.json`, "utf8"));
const wanted = [
  "Брызги кислоты",
  "Безмолвный образ",
  "Благословение",
  "Огненный шар",
  "Желание",
  "Малая иллюзия",
  "Дружба",
  "Щит",
  "Лечение ран",
  "Телепортация",
  "Радужная стена",
];
const byName = new Map(snapshot.spells.map((s) => [s.name, s.id]));
const ids = process.env.IDS ? process.env.IDS.split(",") : wanted.map((n) => byName.get(n)).filter(Boolean);
console.log("ids:", ids.length, ids.slice(0, 3));

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
    } else if (msg.method === "Runtime.consoleAPICalled") {
      const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (msg.params.type === "error") console.log("CONSOLE ERROR", text.slice(0, 500));
    } else if (msg.method === "Runtime.exceptionThrown") {
      console.log("EXCEPTION", msg.params.exceptionDetails.exception?.description?.slice(0, 700));
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

  await send("Page.navigate", { url: `${process.env.BASE ?? "http://127.0.0.1:3000"}/` });
  await sleep(3500);
  if (process.env.SEED) {
    const expression = readFileSync(`${ROOT}\\${process.env.SEED}`, "utf8");
    await send("Runtime.evaluate", { expression, awaitPromise: true });
  }
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem('pedinburgh:selection', ${JSON.stringify(JSON.stringify(ids))})`,
  });

  await send("Page.navigate", { url: `${process.env.BASE ?? "http://127.0.0.1:3000"}/print` });
  await sleep(4000);

  if (process.env.PAGENUM) {
    const toggled = await send("Runtime.evaluate", {
      expression: `(() => { const btn=document.querySelector('button[aria-label="Номера листов"]'); btn?.click(); return { found: !!btn, pressed: btn?.getAttribute('aria-checked') }; })()`,
      returnByValue: true,
    });
    console.log("PAGENUM", JSON.stringify(toggled.result.value));
    await sleep(600);
  }

  const info = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      buttons: [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,12),
      sheets: document.querySelectorAll('[style*="aspect-ratio"]').length
    })`,
    returnByValue: true,
  });
  console.log("PAGE", info.result.value);

  await send("Runtime.evaluate", {
    expression: `(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Скачать PDF')); if(!b) return 'no button'; b.click(); return 'clicked'; })()`,
    returnByValue: true,
  }).then((r) => console.log("CLICK", r.result.value));

  let file = null;
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const files = existsSync(DOWNLOADS) ? readdirSync(DOWNLOADS).filter((f) => f.endsWith(".pdf")) : [];
    if (files.length) {
      file = files[0];
      break;
    }
  }
  console.log(file ? `DOWNLOADED ${file}` : "NO PDF");
} catch (error) {
  console.error("flow failed:", error);
  process.exitCode = 1;
} finally {
  try {
    ws?.close();
  } catch {}
  browser.kill();
}
