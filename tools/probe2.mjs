// Проверка сида: пишем в localStorage, перезагружаем, читаем состояние.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = "C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace";
const url = process.argv[2];
const seed = process.argv[3];
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9820 + Math.floor(Math.random() * 80);

const browser = spawn(
  EDGE,
  ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\.edge-cdp`, "--window-size=1440,1200", "about:blank"],
  { stdio: "ignore" }
);

try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {}
    await sleep(200);
  }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r, { once: true }); ws.addEventListener("error", j, { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const mid = ++id; pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params })); });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:3000/library" });
  await sleep(2500);
  const seedRes = await send("Runtime.evaluate", { expression: readFileSync(seed, "utf8"), awaitPromise: true, returnByValue: true });
  console.log("SEED:", seedRes.result.value, seedRes.exceptionDetails?.text ?? "");
  const stored = await send("Runtime.evaluate", {
    expression: `JSON.stringify({ custom: localStorage.getItem('pedinburgh:customCards')?.length ?? -1, sel: localStorage.getItem('pedinburgh:selection')?.length ?? -1, raw: localStorage.getItem('pedinburgh:selection')?.slice(0, 80) })`,
    returnByValue: true,
  });
  console.log("STORED:", stored.result.value);
  await send("Page.navigate", { url });
  await sleep(3500);
  const state = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      href: location.href,
      sel: localStorage.getItem('pedinburgh:selection')?.length ?? -1,
      cards: document.querySelectorAll('.spell-card').length,
      h1: document.querySelector('h1')?.textContent,
      nav: [...document.querySelectorAll('header a')].map(a => a.textContent.trim())
    })`,
    returnByValue: true,
  });
  console.log("STATE:", state.result.value);
  ws.close();
} catch (error) {
  console.error("probe2 failed:", error);
} finally {
  browser.kill();
}
