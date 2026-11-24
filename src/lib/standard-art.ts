import manifest from "../../data/standard-art.json";

/** Стандартные иллюстрации из Figma: нормализованное имя → путь в /public. */
export const STANDARD_ART = manifest as Record<string, string>;
