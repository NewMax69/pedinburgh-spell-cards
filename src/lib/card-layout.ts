import {
  BODY,
  COMPONENTS_TYPE,
  FOOTER,
  RANGE,
  TITLE,
  TITLE_TYPE,
  BODY_TYPE,
} from "./card-spec";
import { fitSingleLine, layoutParagraphs, type Layout } from "./layout";
import { footerFor, normalizeSchool } from "./schools";
import type { RenderOptions, Spell } from "./types";

export interface RangeCell {
  size: number;
  text: string;
}

export interface CardLayoutResult {
  title: Layout;
  components: Layout;
  body: Layout;
  range: RangeCell[];
  footer: { size: number; text: string };
  componentsTop: number;
  overflow: boolean;
}

function hashString(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const cache = new Map<string, CardLayoutResult>();

function keyFor(spell: Spell, options: RenderOptions): string {
  return hashString(
    [
      spell.name,
      spell.level,
      spell.school,
      spell.art,
      spell.body.join("\u0001"),
      spell.upgrade,
      spell.casting,
      spell.range,
      spell.duration,
      spell.components,
      options.showArt === false ? 0 : 1,
      options.showUpgrade === false ? 0 : 1,
      options.showComponents === false ? 0 : 1,
    ].join("\u0000")
  );
}

const TITLE_LINE_RATIO = 11.8 / 12;
const TITLE_COMPONENTS_GAP = 1.9;

export function getCardLayout(spell: Spell, options: RenderOptions = {}): CardLayoutResult {
  const key = keyFor(spell, options);
  const cached = cache.get(key);
  if (cached) return cached;

  const title = layoutParagraphs([spell.name], {
    width: TITLE.w,
    maxHeight: TITLE.maxH,
    base: TITLE_TYPE.base,
    min: TITLE_TYPE.min,
    lineRatio: TITLE_LINE_RATIO,
    gapRatio: 0,
    maxLines: TITLE_TYPE.maxLines,
    italic: false,
    labels: false,
  });

  const componentsHeight = Math.max(
    COMPONENTS_TYPE.base,
    TITLE.maxH - title.height - TITLE_COMPONENTS_GAP
  );
  const components = options.showComponents === false
    ? layoutParagraphs([], { width: TITLE.w, maxHeight: 1, base: 9, min: 9, lineRatio: 1.111, gapRatio: 0 })
    : layoutParagraphs(["Компоненты:", spell.components || "—"], {
        width: TITLE.w,
        maxHeight: componentsHeight,
        base: COMPONENTS_TYPE.base,
        min: COMPONENTS_TYPE.min,
        lineRatio: COMPONENTS_TYPE.lineRatio,
        gapRatio: 0,
        maxLines: COMPONENTS_TYPE.maxLines,
        italic: false,
        labels: false,
      });

  const paragraphs: string[] = [];
  if (options.showArt !== false && spell.art) paragraphs.push(spell.art);
  if (spell.body.length) paragraphs.push(...spell.body);
  if (options.showUpgrade !== false && spell.upgrade) paragraphs.push(spell.upgrade);
  if (paragraphs.length === 0) paragraphs.push("Описание пока не заполнено.");

  const body = layoutParagraphs(paragraphs, {
    width: BODY.w,
    maxHeight: BODY.bottom - BODY.y,
    base: BODY_TYPE.base,
    min: BODY_TYPE.min,
    lineRatio: BODY_TYPE.lineRatio,
    gapRatio: BODY_TYPE.gapRatio,
    italic: true,
  });

  const range = [spell.casting, spell.range, spell.duration].map((value) => {
    const fit = fitSingleLine(value, RANGE.cell - 2, 9, 6.2, true, true);
    return { size: fit.size, text: fit.text };
  });

  const footerFit = fitSingleLine(
    footerFor(spell.level, normalizeSchool(spell.school)),
    RANGE.w,
    9.5,
    7,
    false,
    true
  );

  const result: CardLayoutResult = {
    title,
    components,
    body,
    range,
    footer: { size: footerFit.size, text: footerFit.text },
    componentsTop: title.height + TITLE_COMPONENTS_GAP,
    overflow: title.truncated || components.truncated || body.truncated,
  };

  if (cache.size > 2000) cache.clear();
  cache.set(key, result);
  return result;
}

export function resetCardLayoutCache() {
  cache.clear();
}
