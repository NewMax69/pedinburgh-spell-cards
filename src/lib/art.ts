import { SCHOOL_META, type School } from "./schools";

const cache = new Map<string, string>();

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shiftHue(hex: string, degrees: number): string {
  const [r0, g0, b0] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r0) h = ((g0 - b0) / d + (g0 < b0 ? 6 : 0)) / 6;
    else if (max === g0) h = ((b0 - r0) / d + 2) / 6;
    else h = ((r0 - g0) / d + 4) / 6;
  }
  h = (h + degrees / 360 + 1) % 1;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const SIDES: Record<School, number> = {
  Воплощение: 3,
  Ограждение: 6,
  Иллюзия: 5,
  Очарование: 4,
  Некромантия: 7,
  Преобразование: 8,
  Вызов: 9,
  Прорицание: 5,
};

/**
 * Абстрактная «арканная» иллюстрация-заглушка: детерминированная по имени
 * и школе, чтобы у каждой карточки был свой рисунок.
 */
export function placeholderArt(key: string, school: School, size = 384): string {
  const cacheKey = `${key}|${school}|${size}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rnd = mulberry32(hash(cacheKey) || 1);
  const meta = SCHOOL_META[school];
  const color = meta.color;
  const accent = shiftHue(color, ((hash(key) >>> 8) % 46) - 23);

  const base = ctx.createLinearGradient(0, 0, size * 0.4, size);
  base.addColorStop(0, "#1a2030");
  base.addColorStop(0.55, meta.dark);
  base.addColorStop(1, "#0a0d13");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // цветные свечения
  for (let i = 0; i < 3; i++) {
    const cx = size * (0.15 + rnd() * 0.7);
    const cy = size * (0.15 + rnd() * 0.7);
    const r = size * (0.25 + rnd() * 0.45);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(i === 0 ? color : accent, 0.6));
    g.addColorStop(0.5, rgba(i === 0 ? color : accent, 0.2));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // тонкая сетка
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const step = size / 16;
  for (let i = 1; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
  }

  const cx = size * 0.5;
  const cy = size * 0.52;

  // арканные окружности
  ctx.save();
  ctx.translate(cx, cy);
  const rings = [0.44, 0.38, 0.27];
  rings.forEach((r, index) => {
    ctx.beginPath();
    ctx.arc(0, 0, size * r, 0, Math.PI * 2);
    ctx.strokeStyle = index === 1 ? rgba(accent, 0.65) : "rgba(255,255,255,0.18)";
    ctx.lineWidth = index === 1 ? 1.6 : 1;
    ctx.setLineDash(index === 0 ? [2, size * 0.012] : []);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // рунические насечки по кольцу
  const ticks = 48;
  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * Math.PI * 2 + rnd() * 0.02;
    const inner = size * 0.44;
    const len = i % 4 === 0 ? size * 0.035 : size * 0.016;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * (inner + len), Math.sin(angle) * (inner + len));
    ctx.strokeStyle = i % 4 === 0 ? rgba(accent, 0.6) : "rgba(255,255,255,0.16)";
    ctx.lineWidth = i % 4 === 0 ? 1.4 : 1;
    ctx.stroke();
  }

  // сигил: вложенные многоугольники + связи
  const sides = SIDES[school];
  const rotation = rnd() * Math.PI * 2;
  const radius = size * 0.24;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const next = points[(i + 1) % points.length];
    if (i % 2 === 0) {
      ctx.moveTo(x, y);
      ctx.lineTo(next[0], next[1]);
    }
  });
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();

  points.forEach(([x, y], i) => {
    ctx.beginPath();
    ctx.arc(x, y, i % 3 === 0 ? size * 0.012 : size * 0.007, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? rgba(color, 0.9) : "rgba(255,255,255,0.6)";
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = rgba(color, 0.24);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.8);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // блик
  const shine = ctx.createLinearGradient(0, 0, size, size);
  shine.addColorStop(0, "rgba(255,255,255,0.10)");
  shine.addColorStop(0.35, "rgba(255,255,255,0)");
  shine.addColorStop(1, "rgba(255,255,255,0.05)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, size, size);

  // зерно
  const grain = ctx.getImageData(0, 0, size, size);
  const data = grain.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rnd() - 0.5) * 10;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(grain, 0, 0);

  // виньетка
  const vignette = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  const url = canvas.toDataURL("image/jpeg", 0.85);
  cache.set(cacheKey, url);
  return url;
}
