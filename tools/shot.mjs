// Снимает скриншот страницы через Chrome DevTools Protocol.
// Запуск: node tools/shot.mjs <url> <out.png> [width] [height] [delayMs] [scale]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [, , url, out, w = "1440", h = "2100", delay = "1800", scale = "2", seedFile] = process.argv;
if (!url || !out) {
  console.error("usage: node shot.mjs <url> <out.png> [w] [h] [delay] [scale]");
  process.exit(1);
}

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333 + Math.floor(Math.random() * 200);
const profile = `C:\\Users\\Максим\\Documents\\deepseek-harness\\default-workspace\\.edge-cdp`;

const browser = spawn(
  EDGE,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch {
      /* not ready */
    }
    await sleep(200);
  }
  throw new Error("devtools did not start");
}

async function openTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  if (!res.ok) throw new Error(`json/new ${res.status}`);
  return res.json();
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg.method);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

try {
  await waitForDevtools();
  const target = await openTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const cdp = new CDP(ws);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: Number(w),
    height: Number(h),
    deviceScaleFactor: Number(scale),
    mobile: false,
  });

  await cdp.send("Page.navigate", { url });
  for (let i = 0; i < 100; i++) {
    if (cdp.events.includes("Page.loadEventFired")) break;
    await sleep(100);
  }
  await sleep(1200);

  if (seedFile) {
    const { readFileSync } = await import("node:fs");
    const expression = readFileSync(seedFile, "utf8");
    const origin = new URL(url).origin;
    await cdp.send("Page.navigate", { url: `${origin}/library` });
    await sleep(1500);
    await cdp.send("Runtime.evaluate", { expression, awaitPromise: true });
    await cdp.send("Page.navigate", { url });
    await sleep(1500);
  }

  await sleep(Number(delay));

  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: !process.env.CLIP,
    fromSurface: true,
    ...(process.env.CLIP
      ? {
          clip: (() => {
            const [x, y, width, height] = process.env.CLIP.split(",").map(Number);
            return { x, y, width, height, scale: Number(scale) };
          })(),
        }
      : {}),
  });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`saved ${out}`);
  ws.close();
} catch (error) {
  console.error("shot failed:", error.message);
  process.exitCode = 1;
} finally {
  browser.kill();
}
