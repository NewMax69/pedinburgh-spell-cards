export const CARD_W = 180;
export const CARD_H = 252;

export const HEADER_H = 80;

export const ILLU = { x: 12, y: 12, size: 60, inset: 3, image: 54 };
export const BADGE = { x: 10, y: 10, w: 18, h: 21 };
/** y — верх строки (line box), чернила заголовка начинаются на 12 */
export const TITLE = { x: 80, y: 11.4, w: 88, maxH: 66 };

/** y — верх строки; чернила накладывания начинаются на 88 */
export const RANGE = { x: 12, y: 87, w: 156, h: 10, cell: 46.67, sep: [50.67, 105.33] };

/** y — верх первой строки тела; чернила начинаются на 101,8 */
export const BODY = { x: 12, y: 100.5, w: 156, bottom: 226 };
export const BODY_H = BODY.bottom - BODY.y;

export const DIVIDER = { x: 12, y: 228, w: 156 };
/** y — верх строки; чернила школы начинаются на 234,2 */
export const FOOTER = { y: 232, h: 12 };

export const A4 = { w: 595.28, h: 841.89 };
export const GRID = {
  cols: 3,
  rows: 3,
  gap: 0,
  startX: (A4.w - CARD_W * 3) / 2,
  startY: (A4.h - CARD_H * 3) / 2,
};

export const FONT = {
  family: "Alegreya Sans",
  ui: "Manrope",
};

export const BODY_TYPE = {
  base: 9,
  min: 6.1,
  lineRatio: 1.111,
  gapRatio: 0.444,
};

export const TITLE_TYPE = {
  base: 12,
  min: 8.4,
  lineRatio: 1.14,
  maxLines: 3,
};

export const COMPONENTS_TYPE = {
  base: 9,
  min: 6.4,
  lineRatio: 1.111,
  maxLines: 3,
};

/**
 * Квадрат со срезанными углами. Слой рамки строится вложенными заливками:
 * 0 — чёрная, 1 — белая кромка, 3 — чёрная внутренняя, картинка с 4.
 */
export function notchedSquarePath(inset: number, size = 60, notch = 4): string {
  const a = inset;
  const b = size - inset;
  const n = a + notch;
  return `M${a} ${n}H${n}V${a}H${b - notch}V${n}H${b}V${b - notch}H${b - notch}V${b}H${n}V${b - notch}H${a}V${n}Z`;
}

export const FRAME_LAYERS = {
  plate: notchedSquarePath(0),
  outerStroke: notchedSquarePath(0.5),
  innerStroke: notchedSquarePath(3.5),
  clip: notchedSquarePath(3),
  imageInset: 3,
  imageSize: 54,
};

/** Ромб со скруглёнными углами (бейдж ритуала 14×16). */
export function roundedPolygonPath(points: [number, number][], radius: number): string {
  const n = points.length;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const current = points[i];
    const next = points[(i + 1) % n];
    const v1 = [current[0] - prev[0], current[1] - prev[1]];
    const v2 = [next[0] - current[0], next[1] - current[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1;
    const l2 = Math.hypot(v2[0], v2[1]) || 1;
    const p1 = [current[0] - (v1[0] / l1) * radius, current[1] - (v1[1] / l1) * radius];
    const p2 = [current[0] + (v2[0] / l2) * radius, current[1] + (v2[1] / l2) * radius];
    parts.push(`${i === 0 ? "M" : "L"}${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`);
    parts.push(`Q${current[0]} ${current[1]} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return `${parts.join("")}Z`;
}

export const RITUAL = {
  x: 19,
  y: 24,
  w: 14,
  h: 16,
  scale: 0.762,
  offsetX: 0.14,
};

export const FRAME_OUTER = notchedSquarePath(0);
export const FRAME_INNER = notchedSquarePath(3);
export const FRAME_STROKE = 1;
export const BADGE_STROKE = 1;

export const BADGE_PATH =
  "M8.39536 0.352709C8.76899 0.134756 9.23101 0.134756 9.60465 0.35271L17.4046 4.90271C17.7733 5.11776 18 5.51244 18 5.93924V15.0608C18 15.4876 17.7733 15.8822 17.4046 16.0973L9.60464 20.6473C9.23101 20.8652 8.76899 20.8652 8.39536 20.6473L0.595354 16.0973C0.226693 15.8822 0 15.4876 0 15.0608V5.93924C0 5.51244 0.226693 5.11776 0.595355 4.90271L8.39536 0.352709Z";

export const BADGE_MINI =
  "M6.529 0.274C6.82 0.105 7.18 0.105 7.471 0.274L13.536 3.81C13.823 3.977 14 4.283 14 4.614V11.386C14 11.717 13.823 12.023 13.536 12.19L7.471 15.726C7.18 15.895 6.82 15.895 6.529 15.726L1.464 12.19C1.177 12.023 1 11.717 1 11.386V4.614C1 4.283 1.177 3.977 1.464 3.81L6.529 0.274Z";
