// Проверка drag&drop на листе печати синтетическими DragEvent.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = "C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 10120 + Math.floor(Math.random() * 100);
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const ids = JSON.parse(readFileSync(`${ROOT}\\data\\spells.json`, "utf8")).spells.slice(0, 6).map((s) => s.id);

const browser = spawn(EDGE, ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\.edge-cdp`, "--window-size=1440,1200", "about:blank"], { stdio: "ignore" });
let ws;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(200); }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r, { once: true }); ws.addEventListener("error", j, { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const mid = ++id; pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params })); });

  await send("Runtime.enable"); await send("Page.enable");
  await send("Page.navigate", { url: `${BASE}/` }); await sleep(2500);
  await send("Runtime.evaluate", { expression: `localStorage.setItem('pedinburgh:selection', ${JSON.stringify(JSON.stringify(ids))})` });
  await send("Page.navigate", { url: `${BASE}/print` }); await sleep(3500);

  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const slots = [...document.querySelectorAll('[style*="cursor: grab"]')];
      if (slots.length < 3) return 'slots ' + slots.length;
      const dt = new DataTransfer();
      slots[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      slots[2].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      slots[2].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      return 'dropped';
    })()`,
    returnByValue: true,
  });
  console.log("DRAG", result.result.value);
  await sleep(1200);
  const store = await send("Runtime.evaluate", { expression: `localStorage.getItem('pedinburgh:selection')`, returnByValue: true });
  console.log("STORE", store.result.value?.slice(0, 220));
} catch (e) { console.error(e); process.exitCode = 1; }
finally { try { ws?.close(); } catch {} browser.kill(); }
