export const SCHOOLS = [
  "Воплощение",
  "Ограждение",
  "Иллюзия",
  "Очарование",
  "Некромантия",
  "Преобразование",
  "Вызов",
  "Прорицание",
] as const;

export type School = (typeof SCHOOLS)[number];

export const SCHOOL_META: Record<
  School,
  { genitive: string; color: string; tint: string; dark: string }
> = {
  Воплощение: { genitive: "воплощения", color: "#D97706", tint: "#FDF0DC", dark: "#7C3F06" },
  Ограждение: { genitive: "ограждения", color: "#2563EB", tint: "#E8EFFD", dark: "#173A80" },
  Иллюзия: { genitive: "иллюзии", color: "#7C3AED", tint: "#F1EAFE", dark: "#43208A" },
  Очарование: { genitive: "очарования", color: "#DB2777", tint: "#FDEBF3", dark: "#7C1243" },
  Некромантия: { genitive: "некромантии", color: "#4D7C0F", tint: "#EFF5DF", dark: "#2C4708" },
  Преобразование: { genitive: "преобразования", color: "#0891B2", tint: "#E3F6FA", dark: "#064E61" },
  Вызов: { genitive: "вызова", color: "#B45309", tint: "#FBEFE0", dark: "#63300A" },
  Прорицание: { genitive: "прорицания", color: "#0F766E", tint: "#E3F5F2", dark: "#08443F" },
};

const SCHOOL_ALIASES: Record<string, School> = {
  воплощение: "Воплощение",
  ограждение: "Ограждение",
  иллюзия: "Иллюзия",
  очарование: "Очарование",
  некромантия: "Некромантия",
  преобразование: "Преобразование",
  вызов: "Вызов",
  // частые опечатки/варианты в таблице
  преображение: "Преобразование",
};

export function isSchool(value: string | undefined | null): value is School {
  return !!value && (SCHOOLS as readonly string[]).includes(value);
}

export function normalizeSchool(value: string | undefined | null): School | null {
  const key = (value ?? "").trim().toLowerCase();
  if (!key) return null;
  if (isSchool(value!)) return value as School;
  return SCHOOL_ALIASES[key] ?? null;
}

export function schoolGenitive(school: School | null): string {
  return school ? SCHOOL_META[school].genitive : "магии";
}

export function footerFor(level: number, school: School | null): string {
  const prefix = level === 0 ? "Заговор" : "Заклинание";
  return `${prefix} ${schoolGenitive(school)}`;
}

export const LEVEL_LABEL: Record<number, string> = {
  0: "Заговоры",
  1: "1 круг",
  2: "2 круг",
  3: "3 круг",
  4: "4 круг",
  5: "5 круг",
  6: "6 круг",
  7: "7 круг",
  8: "8 круг",
  9: "9 круг",
};

export function levelName(level: number): string {
  if (level === 0) return "Заговор";
  return `${level} круг`;
}

export function levelCountLabel(level: number): string {
  if (level === 0) return "0 круг";
  return `${level} круг`;
}
