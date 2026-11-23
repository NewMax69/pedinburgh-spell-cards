import { FRAME_INNER, FRAME_OUTER, FRAME_STROKE } from "./card-spec";

const cache = new Map<string, string>();

/**
 * Растр белой рамки иллюстрации (прозрачный центр) для вставки в PDF.
 * Рисуем из того же SVG-пути, что и DOM, при 10× для печати.
 */
export async function getFramePng(ink = "#141313", paper = "#FFFFFF"): Promise<string> {
  const key = `${ink}|${paper}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 60 60">
    <path d="${FRAME_OUTER} ${FRAME_INNER}" fill="${paper}" fill-rule="evenodd"/>
    <path d="${FRAME_OUTER}" fill="none" stroke="${ink}" stroke-width="${FRAME_STROKE}"/>
    <path d="${FRAME_INNER}" fill="none" stroke="${ink}" stroke-width="${FRAME_STROKE}"/>
  </svg>`;

  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  const image = new Image();
  image.src = url;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, size, size);
  const png = canvas.toDataURL("image/png");
  cache.set(key, png);
  return png;
}
