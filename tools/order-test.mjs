// Проверка ручного порядка: ставит «3» в первое поле и смотрит, как переставился список.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = "C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9920 + Math.floor(Math.random() * 100);
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";

const snapshot = JSON.parse(readFileSync(`${ROOT}\\data\\spells.json`, "utf8"));
const ids = snapshot.spells.slice(0, 6).map((s) => s.id);

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
  await send("Page.navigate", { url: `${BASE}/` });
  await sleep(2500);
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem('pedinburgh:selection', ${JSON.stringify(JSON.stringify(ids))})`,
  });
  await send("Page.navigate", { url: `${BASE}/print` });
  await sleep(3500);

  const before = await send("Runtime.evaluate", {
    expression: `JSON.stringify([...document.querySelectorAll('ul li')].map(li => li.innerText.split('\\n')[0]).slice(0,6))`,
    returnByValue: true,
  });
  console.log("BEFORE", before.result.value);

  await send("Runtime.evaluate", {
    expression: `(() => {
      const input = document.querySelector('input[aria-label="Порядковый номер"]');
      if (!input) return 'no input';
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '3');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
      return 'set ' + input.value + ' count=' + document.querySelectorAll('input[aria-label="Порядковый номер"]').length;
    })()`,
    returnByValue: true,
  }).then((r) => console.log("SET", r.result.value));
  await sleep(1200);

  const store = await send("Runtime.evaluate", {
    expression: `localStorage.getItem('pedinburgh:selection')`,
    returnByValue: true,
  });
  console.log("STORE", store.result.value?.slice(0, 200));

  const after = await send("Runtime.evaluate", {
    expression: `JSON.stringify([...document.querySelectorAll('ul li')].map(li => li.innerText.split('\\n')[0]).slice(0,6))`,
    returnByValue: true,
  });
  console.log("AFTER", after.result.value);
} catch (error) {
  console.error("order flow failed:", error);
  process.exitCode = 1;
} finally {
  try {
    ws?.close();
  } catch {}
  browser.kill();
}
