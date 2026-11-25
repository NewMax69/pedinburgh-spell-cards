// Проверка ручного порядка реальными событиями мыши/клавиатуры.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = "C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 10020 + Math.floor(Math.random() * 100);
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const snapshot = JSON.parse(readFileSync(`${ROOT}\\data\\spells.json`, "utf8"));
const ids = snapshot.spells.slice(0, 6).map((s) => s.id);

const browser = spawn(EDGE, [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\.edge-cdp`,
  "--window-size=1440,1200", "about:blank",
], { stdio: "ignore" });

let ws;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {}
    await sleep(200);
  }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const mid = ++id; pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params })); });

  await send("Runtime.enable"); await send("Page.enable");
  await send("Page.navigate", { url: `${BASE}/` }); await sleep(2500);
  await send("Runtime.evaluate", { expression: `localStorage.setItem('pedinburgh:selection', ${JSON.stringify(JSON.stringify(ids))})` });
  await send("Page.navigate", { url: `${BASE}/print` }); await sleep(3500);

  const box = await send("Runtime.evaluate", {
    expression: `(() => { const r = document.querySelector('input[aria-label="Порядковый номер"]').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`,
    returnByValue: true,
  });
  const { x, y } = JSON.parse(box.result.value);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2 });
  await send("Input.insertText", { text: "3" });
  const focused = await send("Runtime.evaluate", {
    expression: `(document.activeElement?.getAttribute('aria-label') || 'none') + '|' + document.querySelector('input[aria-label="Порядковый номер"]').value`,
    returnByValue: true,
  });
  console.log("FOCUS", focused.result.value);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(1500);

  const store = await send("Runtime.evaluate", { expression: `localStorage.getItem('pedinburgh:selection')`, returnByValue: true });
  console.log("STORE", store.result.value?.slice(0, 220));
  const list = await send("Runtime.evaluate", {
    expression: `JSON.stringify([...document.querySelectorAll('ul li')].map(li => li.innerText.split('\\n')[0]).slice(0,6))`,
    returnByValue: true,
  });
  console.log("LIST", list.result.value);
} catch (e) { console.error(e); process.exitCode = 1; }
finally { try { ws?.close(); } catch {} browser.kill(); }
