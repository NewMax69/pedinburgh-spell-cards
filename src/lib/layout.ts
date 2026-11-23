import { measure } from "./measure";
import { leadingLabel } from "./text";

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface Line {
  runs: Run[];
  y: number;
  height: number;
  width: number;
}

export interface Layout {
  size: number;
  lineHeight: number;
  lines: Line[];
  height: number;
  truncated: boolean;
  maxWidth: number;
}

interface Token {
  runs: Run[];
  space: boolean;
  width: number;
}

interface LayoutOpts {
  width: number;
  maxHeight: number;
  base: number;
  min: number;
  lineRatio: number;
  gapRatio: number;
  italic?: boolean;
  maxLines?: number;
  labels?: boolean;
}

const spaceCache = new Map<string, number>();

function spaceWidth(size: number, bold: boolean, italic: boolean) {
  const key = `${size}|${bold}|${italic}`;
  let w = spaceCache.get(key);
  if (w === undefined) {
    w = measure(" ", size, bold, italic);
    spaceCache.set(key, w);
  }
  return w;
}

/** Разбирает **жирный**, *курсив* и __жирный__ в набор стилевых фрагментов. */
export function parseMarkup(text: string): Run[] {
  const value = text ?? "";
  const runs: Run[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    if (match.index > last) runs.push({ text: value.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      runs.push({ text: token.slice(2, -2), bold: true });
    } else {
      runs.push({ text: token.slice(1, -1), italic: true });
    }
    last = match.index + token.length;
  }
  if (last < value.length) runs.push({ text: value.slice(last) });
  return runs.filter((run) => run.text.length > 0);
}

export function paragraphRuns(text: string, labels = true): Run[] {
  const value = (text ?? "").trim();
  if (!value) return [];
  const lead = labels ? leadingLabel(value) : null;
  if (lead) {
    return [{ text: `${lead.label}:`, bold: true }, ...parseMarkup(` ${lead.rest}`)];
  }
  return parseMarkup(value);
}

function runItalic(run: Run, fallback: boolean) {
  return run.italic ?? fallback;
}

function tokenize(runs: Run[], size: number, italic: boolean): Token[] {
  const tokens: Token[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const it = runItalic(run, italic);
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        tokens.push({ runs: [], space: true, width: spaceWidth(size, !!run.bold, it) });
      } else {
        tokens.push({
          runs: [{ text: part, bold: run.bold, italic: it }],
          space: false,
          width: measure(part, size, !!run.bold, it),
        });
      }
    }
  }
  return tokens;
}

function tokensToRuns(tokens: Token[]): Run[] {
  const runs: Run[] = [];
  for (const token of tokens) {
    if (token.space) {
      runs.push({ text: " " });
      continue;
    }
    for (const run of token.runs) {
      const prev = runs[runs.length - 1];
      if (prev && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic) {
        prev.text += run.text;
      } else {
        runs.push({ ...run });
      }
    }
  }
  while (runs.length && /^\s*$/.test(runs[runs.length - 1].text)) runs.pop();
  while (runs.length && /^\s+/.test(runs[0].text)) runs[0].text = runs[0].text.replace(/^\s+/, "");
  return runs.filter((run) => run.text.length > 0);
}

function runsWidth(runs: Run[], size: number, italic: boolean): number {
  return runs.reduce((sum, run) => sum + measure(run.text, size, !!run.bold, runItalic(run, italic)), 0);
}

/** Дробит слишком длинное слово по символам, чтобы оно не вылезало за карточку. */
function breakToken(token: Token, maxWidth: number, size: number): Token[] {
  const chars: Token[] = [];
  for (const run of token.runs) {
    const it = !!run.italic;
    for (const char of Array.from(run.text)) {
      chars.push({
        runs: [{ text: char, bold: run.bold, italic: run.italic }],
        space: false,
        width: measure(char, size, !!run.bold, it),
      });
    }
  }
  const chunks: Token[] = [];
  let current: Token[] = [];
  let width = 0;
  for (const char of chars) {
    if (current.length && width + char.width > maxWidth) {
      chunks.push({ runs: tokensToRuns(current), space: false, width });
      current = [];
      width = 0;
    }
    current.push(char);
    width += char.width;
  }
  if (current.length) chunks.push({ runs: tokensToRuns(current), space: false, width });
  return chunks;
}

function wrapParagraph(
  runs: Run[],
  size: number,
  italic: boolean,
  maxWidth: number,
  allowBreak: boolean
): Run[][] {
  const tokens = tokenize(runs, size, italic);
  const lines: Run[][] = [];
  let current: Token[] = [];
  let width = 0;
  let pendingSpace = false;

  const flush = () => {
    if (current.length) {
      lines.push(tokensToRuns(current));
      current = [];
      width = 0;
      pendingSpace = false;
    }
  };

  for (const token of tokens) {
    if (token.space) {
      pendingSpace = current.length > 0;
      continue;
    }

    if (allowBreak && token.width > maxWidth + 0.4) {
      flush();
      const chunks = breakToken(token, maxWidth, size);
      for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i].runs);
      current = [chunks[chunks.length - 1]];
      width = current[0]?.width ?? 0;
      pendingSpace = false;
      continue;
    }

    const extra = pendingSpace ? spaceWidth(size, !!token.runs[0]?.bold, italic) : 0;
    if (current.length && width + extra + token.width > maxWidth) {
      flush();
      current = [token];
      width = token.width;
      pendingSpace = false;
    } else {
      if (pendingSpace && current.length) {
        current.push({ runs: [], space: true, width: extra });
        width += extra;
      }
      current.push(token);
      width += token.width;
      pendingSpace = false;
    }
  }
  flush();
  return lines;
}

function ellipsize(line: Token[], size: number, italic: boolean, maxWidth: number): Run[] {
  const dotWidth = measure("…", size, false, italic);
  const tokens = [...line];
  while (tokens.length) {
    const candidate = tokensToRuns(tokens);
    if (runsWidth(candidate, size, italic) + dotWidth <= maxWidth) break;
    tokens.pop();
    while (tokens.length && tokens[tokens.length - 1].space) tokens.pop();
  }
  const runs = tokensToRuns(tokens);
  while (runs.length && /\s$/.test(runs[runs.length - 1].text)) {
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, "");
    if (!runs[runs.length - 1].text) runs.pop();
  }
  runs.push({ text: "…" });
  return runs;
}

/**
 * Раскладка абзацев с автоподгонкой размера под высоту и обрезкой по словам.
 * Один и тот же результат используется и в DOM, и в PDF.
 */
export function layoutParagraphs(paragraphs: string[], opts: LayoutOpts): Layout {
  const { width, maxHeight, base, min, lineRatio, gapRatio, italic = true, maxLines, labels = true } = opts;
  const prepare = (size: number) => {
    const lineHeight = size * lineRatio;
    const gap = size * gapRatio;
    const lines: Line[] = [];
    let y = 0;
    const allowBreak = size <= min + 0.05;
    const sources = paragraphs.map((p) => paragraphRuns(p, labels)).filter((r) => r.length > 0);
    for (let p = 0; p < sources.length; p++) {
      const wrapped = wrapParagraph(sources[p], size, italic, width, allowBreak);
      for (const runs of wrapped) {
        lines.push({ runs, y, height: lineHeight, width: runsWidth(runs, size, italic) });
        y += lineHeight;
      }
      if (p < sources.length - 1) y += gap;
    }
    return {
      lineHeight,
      lines,
      total: lines.length ? y : 0,
      maxLine: lines.reduce((max, line) => Math.max(max, line.width), 0),
    };
  };

  let size = base;
  let best = prepare(size);
  while ((best.total > maxHeight || best.maxLine > width + 0.4) && size > min) {
    size = Math.max(min, Math.round((size - 0.1) * 10) / 10);
    best = prepare(size);
  }

  const lines = best.lines;
  const lineHeight = best.lineHeight;
  let truncated = false;

  let keep = maxLines ? lines.slice(0, maxLines) : lines.filter((line) => line.y + lineHeight <= maxHeight + 0.01);
  if (keep.length === 0 && lines.length) keep = [lines[0]];

  if (keep.length < lines.length) {
    truncated = true;
    const last = keep[keep.length - 1];
    const tokens = tokenize(last.runs, size, italic);
    const trimmed = ellipsize(tokens, size, italic, width);
    keep = [...keep.slice(0, -1), { ...last, runs: trimmed, width: runsWidth(trimmed, size, italic) }];
  }

  const height = keep.length ? keep[keep.length - 1].y + lineHeight : 0;
  return { size, lineHeight, lines: keep, height, truncated, maxWidth: width };
}

/** Подбор размера под одну строку без переноса. */
export function fitSingleLine(
  text: string,
  maxWidth: number,
  base: number,
  min: number,
  bold = true,
  italic = true
): { size: number; text: string; truncated: boolean } {
  let size = base;
  while (size > min && measure(text, size, bold, italic) > maxWidth) {
    size = Math.round((size - 0.1) * 10) / 10;
  }
  if (measure(text, size, bold, italic) <= maxWidth) return { size, text, truncated: false };
  const dot = measure("…", size, bold, italic);
  let out = text;
  while (out.length > 1 && measure(out, size, bold, italic) + dot > maxWidth) {
    out = out.slice(0, -1);
  }
  out = out.replace(/[\s,.;:—-]+$/, "");
  return { size, text: `${out}…`, truncated: true };
}

export function layoutFooter(text: string, width: number, base = 9): { size: number; text: string } {
  const fit = fitSingleLine(text, width, base, 7, false, true);
  return { size: fit.size, text: fit.text };
}
