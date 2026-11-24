import { FRAME_LAYERS } from "./card-spec";

const cache = new Map<string, string>();

/**
 * Растр рамки иллюстрации (прозрачное окно внутри) для вставки в PDF.
 * Рисуется из тех же путей, что и DOM, при 10× для печати.
 */
export async function getFramePng(ink = "#141313", paper = "#FFFFFF"): Promise<string> {
  const key = `${ink}|${paper}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 600;
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
  ctx.lineJoin = "bevel";
  ctx.stroke(new Path2D(FRAME_LAYERS.outerStroke));
  ctx.stroke(new Path2D(FRAME_LAYERS.innerStroke));

  const png = canvas.toDataURL("image/png");
  cache.set(key, png);
  return png;
}
