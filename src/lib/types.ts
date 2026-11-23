export type SpellStatus = "edited" | "draft" | "failed";

export interface Spell {
  id: string;
  name: string;
  /** Второе название через «/», если оно есть в таблице */
  altName?: string;
  level: number;
  school: string;
  ritual: boolean;
  casting: string;
  range: string;
  duration: string;
  components: string;
  /** Художественное вступление (первый абзац авторского описания) */
  art: string;
  /** Абзацы механики */
  body: string[];
  /** Абзац «На высоких уровнях…» */
  upgrade: string;
  /** Официальное описание из таблицы (до авторской адаптации) */
  official?: string;
  status: SpellStatus;
  source?: string;
  /** URL или idb:<key> */
  image?: string;
  custom?: boolean;
  /** Переопределённые элементы оформления (для своих карточек) */
  theme?: CardTheme;
  showArt?: boolean;
  showUpgrade?: boolean;
  showComponents?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface CardTheme {
  header: string;
  accent: string;
  ink: string;
  paper: string;
}

export const DEFAULT_THEME: CardTheme = {
  header: "#B9F3B7",
  accent: "#8FD48C",
  ink: "#141313",
  paper: "#FFFFFF",
};

export interface SpellRow {
  name: string;
  level: number;
  ritual: string;
  school: string;
  casting: string;
  range: string;
  duration: string;
  components: string;
  description: string;
  upgrade: string;
  overhaul: string;
  status: string;
  source: string;
  prompt: string;
}

export interface RenderOptions {
  theme?: CardTheme;
  showUpgrade?: boolean;
  showArt?: boolean;
  showComponents?: boolean;
  showSchool?: boolean;
  showBadge?: boolean;
}
