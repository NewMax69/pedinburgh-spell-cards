export const CASTING_OPTIONS = [
  "Действие",
  "Бон. действ.",
  "Реакция",
  "1 минута",
  "10 минут",
  "1 час",
  "8 часов",
  "12 часов",
  "24 часа",
];

export const RANGE_OPTIONS = [
  "На себя",
  "Касание",
  "1.5 метра",
  "3 метра",
  "4.5 метра",
  "6 метров",
  "9 метров",
  "18 метров",
  "27 метров",
  "30 метров",
  "36.5 метров",
  "45.5 метра",
  "91 метр",
  "152 метра",
  "1.6 км",
  "Особая",
];

export const DURATION_OPTIONS = [
  "Мгновенно",
  "1 раунд",
  "1 минута",
  "10 минут",
  "1 час",
  "8 часов",
  "24 часа",
  "10 дней",
  "Пока не рассеется",
  "Кон. до 1 м.",
  "Кон. до 10 м.",
  "Кон. до 1 ч.",
  "Кон. до 8 ч.",
  "Кон. до 24 ч.",
];

export const KEYWORDS = ["Спасбросок: ", "При попадании: "];

export const UPGRADE_KEYWORDS = ["Улучшение: "];

export interface ComponentParts {
  v: boolean;
  s: boolean;
  m: boolean;
  material: string;
}

export function parseComponents(value: string): ComponentParts {
  const material = value.match(/\(([^)]*)\)/)?.[1]?.trim() ?? "";
  const letters = value
    .replace(/\([^)]*\)/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    v: letters.includes("В"),
    s: letters.includes("С"),
    m: letters.includes("М"),
    material,
  };
}

export function buildComponents(parts: ComponentParts): string {
  const letters = [parts.v && "В", parts.s && "С", parts.m && "М"].filter(Boolean) as string[];
  if (!letters.length) return "";
  const material = parts.m && parts.material.trim() ? ` (${parts.material.trim()})` : "";
  return letters.join(", ") + material;
}
