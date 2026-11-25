import { FRAME_LAYERS } from "./card-spec";

const cache = new Map<string, string>();

/** Обрезает иллюстрацию по форме окна (4 pt на углах), чтобы в PDF не было затеканий. */
export async function clipArtPng(src: string): Promise<string> {
  const hit = cache.get(`art|${src}`);
  if (hit) return hit;
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    await image.decode();
    const size = 540;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, size, size);
    const d = 1 * (size / 54);
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.moveTo(0, d);
    ctx.lineTo(d, d);
    ctx.lineTo(d, 0);
    ctx.lineTo(size - d, 0);
    ctx.lineTo(size - d, d);
    ctx.lineTo(size, d);
    ctx.lineTo(size, size - d);
    ctx.lineTo(size - d, size - d);
    ctx.lineTo(size - d, size);
    ctx.lineTo(d, size);
    ctx.lineTo(d, size - d);
    ctx.lineTo(0, size - d);
    ctx.closePath();
    ctx.fill();
    const png = canvas.toDataURL("image/png");
    cache.set(`art|${src}`, png);
    return png;
  } catch {
    return src;
  }
}

/**
 * Растр рамки иллюстрации (прозрачное окно внутри) для вставки в PDF.
 * Рисуется из тех же путей, что и DOM, при 10× для печати.
 */
export async function getFramePng(ink = "#141313", paper = "#FFFFFF"): Promise<string> {
  const key = `${ink}|${paper}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(size / 60, size / 60);

  const plate = new Path2D(FRAME_LAYERS.plate);
  const window = new Path2D(FRAME_LAYERS.clip);

  // белая паспарту
  ctx.fillStyle = paper;
  ctx.fill(plate);
  // прозрачное окно под иллюстрацию
  ctx.globalCompositeOperation = "destination-out";
  ctx.fill(window);
  ctx.globalCompositeOperation = "source-over";

  // две чёрные обводки
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.lineJoin = "miter";
  ctx.miterLimit = 4;
  ctx.stroke(new Path2D(FRAME_LAYERS.outerStroke));
  ctx.stroke(new Path2D(FRAME_LAYERS.innerStroke));
  const png = canvas.toDataURL("image/png");
  cache.set(key, png);
  return png;
}
