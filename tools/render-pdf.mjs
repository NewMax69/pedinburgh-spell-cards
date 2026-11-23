// Рендер страниц PDF в PNG для проверки.
// Запуск: node tools/render-pdf.mjs <in.pdf> <out-prefix> [scale]
import { readFileSync, writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const [, , input, outPrefix = "ref/pdf-page", scaleArg = "2"] = process.argv;
const scale = Number(scaleArg);

const data = new Uint8Array(readFileSync(input));
const doc = await getDocument({ data, useSystemFonts: true }).promise;
console.log("pages:", doc.numPages);

for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const out = `${outPrefix}-${n}.png`;
  writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("saved", out, canvas.width, canvas.height);
}
