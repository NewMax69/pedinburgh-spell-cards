import type { SpellRow, SpellStatus } from "./types";

const RU_PLURAL = (n: number, one: string, few: string, many: string) => {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

export const FEET_TO_METER = 0.3048;

/** Футы → метры в стиле автора: 60 → 18, 120 → 36.5, 5 → 1.5 */
export function metersFromFeet(feet: number): number {
  const exact = feet * FEET_TO_METER;
  return Math.floor(exact * 2) / 2;
}

export function formatMeters(feet: number): string {
  const m = metersFromFeet(feet);
  const value = Number.isInteger(m) ? String(m) : m.toFixed(1);
  return `${value} ${RU_PLURAL(m, "метр", "метра", "метров")}`;
}

export function rangeShort(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "—";
  const feet = value.match(/^(\d[\d\s]*)\s*фут/i);
  if (feet) {
    const n = Number(feet[1].replace(/\s/g, ""));
    if (Number.isFinite(n)) return formatMeters(n);
  }
  if (/^1\s*мил/i.test(value)) return "1.6 км";
  if (/^[\d.]+\s*мил/i.test(value)) {
    const n = Number(value.replace(",", ".").match(/^([\d.]+)/)?.[1] ?? "0");
    return `${(n * 1.609).toFixed(1).replace(".0", "")} км`;
  }
  return value;
}

const CASTING_MAP: Record<string, string> = {
  "Бонусное действие": "Бон. действ.",
  "Действие": "Действие",
  "Реакция": "Реакция",
  "1 минута": "1 минута",
  "10 минут": "10 минут",
  "1 час": "1 час",
  "8 часов": "8 часов",
  "12 часов": "12 часов",
  "24 часа": "24 часа",
};

export function castingShort(raw: string): string {
  let value = (raw ?? "").trim();
  if (!value) return "—";
  value = value.replace(/\s*или\s+Ритуал\s*,?\s*$/i, "").trim();
  const mapped = CASTING_MAP[value];
  if (mapped) return mapped;
  const minutes = value.match(/^(\d+)\s*минут/i);
  if (minutes) return `${minutes[1]} минут`;
  return value;
}

export function durationShort(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "—";

  const concMinutes = value.match(/(\d+)\s*минут/i);
  if (/концентрац/i.test(value) && concMinutes) {
    return `Кон. до ${concMinutes[1]} м.`;
  }
  const concHours = value.match(/(\d+)\s*час/i);
  if (/концентрац/i.test(value) && concHours) {
    return `Кон. до ${concHours[1]} ч.`;
  }
  if (/^мгновенн/i.test(value)) return "Мгновенно";
  if (/пока не рассеется/i.test(value)) return "Пока не рассеется";
  if (/^до\s+1\s+минут/i.test(value)) return "До 1 мин.";
  if (/^(\d+)\s*раунд/i.test(value)) return `${value.match(/^(\d+)/)?.[1]} раунд`;
  if (/^\d+\s*(час|дн|день|недел)/i.test(value)) {
    return value.replace(/\s*,\s*концентрация/i, "");
  }
  return value.replace(/\s*,\s*концентрация/i, ", конц.");
}

export function componentsText(raw: string): string {
  const value = (raw ?? "").trim();
  return value || "—";
}

/** Убирает «или Ритуал» из времени накладывания и сообщает, ритуал ли это. */
export function isRitual(row: SpellRow): boolean {
  if (/^(да|yes|true)$/i.test((row.ritual ?? "").trim())) return true;
  return /ритуал/i.test(row.casting ?? "");
}

export function cleanName(raw: string): string {
  return (raw ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/[?\uFFFD]+$/g, "")
    .trim();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function mapStatus(raw: string): SpellStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.startsWith("отредакт")) return "edited";
  if (value.startsWith("не проходит") || value.startsWith("не готов")) return "failed";
  return "draft";
}

const LABEL_RE = /^([^:\n]{2,34}):\s*/;

const BOLD_LABELS = [
  "спасбросок",
  "при попадании",
  "на высоких уровнях",
  "улучшение",
  "при касании",
  "увеличение",
  "уменьшение",
  "выбери эффект",
  "реакция",
  "действие",
  "бонусное действие",
  "материальный компонент",
  "важно",
];

/** Абзац начинается с жирного лейбла? */
export function leadingLabel(text: string): { label: string; rest: string } | null {
  const match = text.match(LABEL_RE);
  if (!match) return null;
  const label = match[1].trim();
  const lower = label.toLowerCase();
  if (BOLD_LABELS.some((b) => lower.startsWith(b))) {
    return { label, rest: text.slice(match[0].length) };
  }
  if (label.length <= 24 && /^[А-ЯЁ][^.!?]*$/.test(label) && label.split(" ").length <= 4) {
    return { label, rest: text.slice(match[0].length) };
  }
  return null;
}

export interface ParsedBody {
  art: string;
  body: string[];
  upgrade: string;
}

export function parseBody(text: string): ParsedBody {
  const paragraphs = (text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p && p !== "—" && p !== "-");

  if (paragraphs.length === 0) return { art: "", body: [], upgrade: "" };

  let art = "";
  let rest = paragraphs;
  const first = paragraphs[0];
  if (paragraphs.length > 1 && !leadingLabel(first) && first.length <= 600) {
    art = first;
    rest = paragraphs.slice(1);
  }

  let upgrade = "";
  const body: string[] = [];
  for (const paragraph of rest) {
    if (/^на высоких уровнях/i.test(paragraph)) {
      upgrade = upgrade ? `${upgrade} ${paragraph}` : paragraph;
    } else {
      body.push(paragraph);
    }
  }

  return { art, body, upgrade };
}

export function splitTitle(raw: string): { title: string; alt?: string } {
  const name = cleanName(raw);
  const parts = name.split(" / ");
  if (parts.length > 1) {
    return { title: parts[0], alt: parts.slice(1).join(" / ") };
  }
  return { title: name };
}
