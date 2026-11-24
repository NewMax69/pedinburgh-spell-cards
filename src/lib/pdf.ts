"use client";

import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  A4,
  BADGE,
  BADGE_PATH,
  BODY,
  CARD_H,
  CARD_W,
  DIVIDER,
  FOOTER,
  HEADER_H,
  ILLU,
  RANGE,
  RITUAL,
  TITLE,
  notchedSquarePath,
} from "./card-spec";
import { getCardLayout } from "./card-layout";
import { DIGIT_PATHS, RITUAL_PATH } from "./digit-paths";
import { dataUrlToBytes, resolveArtSrc } from "./art-src";
import { fontsReady } from "./measure";
import { getUnits } from "./client-store";
import { convertRange } from "./units";
import { DEFAULT_THEME, type Spell } from "./types";

const FONT_FILES = {
  regular: "/fonts/AlegreyaSans-Regular.ttf",
  italic: "/fonts/AlegreyaSans-Italic.ttf",
  bold: "/fonts/AlegreyaSans-Bold.ttf",
  boldItalic: "/fonts/AlegreyaSans-BoldItalic.ttf",
};

interface FontPack {
  regular: PDFFont;
  italic: PDFFont;
  bold: PDFFont;
  boldItalic: PDFFont;
  ascent: number;
  descent: number;
}

export type PdfOptions = {
  cutMarks?: boolean;
  pageNumbers?: boolean;
  onProgress?: (done: number, total: number) => void;
};

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

async function loadFonts(doc: PDFDocument): Promise<FontPack> {
  const buffers = await Promise.all(
    Object.values(FONT_FILES).map(async (src) => {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Не удалось загрузить шрифт ${src}`);
      return new Uint8Array(await res.arrayBuffer());
    })
  );
  const [regular, italic, bold, boldItalic] = await Promise.all(
    buffers.map((bytes) => doc.embedFont(bytes, { subset: true }))
  );

  let ascent = 0.98;
  let descent = 0.26;
  try {
    const font = (fontkit as unknown as { create: (b: Uint8Array) => { ascent: number; descent: number; unitsPerEm: number } }).create(
      buffers[0]
    );
    ascent = font.ascent / font.unitsPerEm;
    descent = Math.abs(font.descent) / font.unitsPerEm;
  } catch {
    /* запасные значения */
  }

  return { regular, italic, bold, boldItalic, ascent, descent };
}

function baselineOffset(fonts: FontPack, size: number, lineHeight: number) {
  return (lineHeight - (fonts.ascent + fonts.descent) * size) / 2 + fonts.ascent * size;
}

async function embedImage(
  doc: PDFDocument,
  src: string,
  cache: Map<string, PDFImage | null>
): Promise<PDFImage | null> {
  if (cache.has(src)) return cache.get(src) ?? null;
  try {
    let bytes: Uint8Array;
    let type = "";
    if (src.startsWith("data:")) {
      bytes = dataUrlToBytes(src);
      type = src.slice(5, src.indexOf(";"));
    } else {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`image ${res.status}`);
      bytes = new Uint8Array(await res.arrayBuffer());
      type = res.headers.get("content-type") ?? "";
    }
    const isPng = type.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50);
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    cache.set(src, image);
    return image;
  } catch {
    cache.set(src, null);
    return null;
  }
}

function drawRuns(
  page: PDFPage,
  runs: { text: string; bold?: boolean; italic?: boolean }[],
  x: number,
  baselineY: number,
  size: number,
  fonts: FontPack,
  italicDefault: boolean,
  color: ReturnType<typeof rgb>,
  boldDefault = false
) {
  let cursor = x;
  for (const run of runs) {
    const bold = run.bold || boldDefault;
    const italic = run.italic ?? italicDefault;
    const font = bold ? (italic ? fonts.boldItalic : fonts.bold) : italic ? fonts.italic : fonts.regular;
    if (run.text) {
      page.drawText(run.text, { x: cursor, y: baselineY, size, font, color });
      cursor += font.widthOfTextAtSize(run.text, size);
    }
  }
}

async function drawCard(
  doc: PDFDocument,
  page: PDFPage,
  spell: Spell,
  x: number,
  top: number,
  fonts: FontPack,
  images: Map<string, PDFImage | null>
) {
  const units = getUnits();
  const display = units === "ft" ? { ...spell, range: convertRange(spell.range, units) } : spell;
  const layout = getCardLayout(display, {
    showArt: spell.showArt,
    showUpgrade: spell.showUpgrade,
    showComponents: spell.showComponents,
    artInHeader: spell.artInHeader,
  });
  const theme = { ...DEFAULT_THEME, ...(spell.theme ?? {}) };
  const H = page.getHeight();
  const yTop = H - top;
  const ink = hexToRgb(theme.ink);
  const paper = hexToRgb(theme.paper);

  if (theme.paper.toLowerCase() !== "#ffffff") {
    page.drawRectangle({ x, y: yTop - CARD_H, width: CARD_W, height: CARD_H, color: paper });
  }

  page.drawRectangle({
    x,
    y: yTop - HEADER_H,
    width: CARD_W,
    height: HEADER_H,
    color: hexToRgb(theme.header),
  });

  // Рамка иллюстрации: белая пластина, картинка с вырезанными углами, две обводки.
  const frameX = x + ILLU.x;
  const frameY = yTop - ILLU.y;
  page.drawSvgPath(notchedSquarePath(0), { x: frameX, y: frameY, color: paper });

  const artSrc = await resolveArtSrc(spell);
  const art = await embedImage(doc, artSrc, images);
  if (art) {
    page.drawImage(art, {
      x: frameX + 3,
      y: frameY - 57,
      width: 54,
      height: 54,
    });
  }
  for (const [cx, cy] of [
    [3, 3],
    [53, 3],
    [3, 53],
    [53, 53],
  ]) {
    page.drawRectangle({
      x: frameX + cx,
      y: frameY - cy - 4,
      width: 4,
      height: 4,
      color: paper,
    });
  }
  page.drawSvgPath(notchedSquarePath(0.5), {
    x: frameX,
    y: frameY,
    borderColor: ink,
    borderWidth: 1,
  });
  page.drawSvgPath(notchedSquarePath(3.5), {
    x: frameX,
    y: frameY,
    borderColor: ink,
    borderWidth: 1,
  });

  // Ритуал — ромб 14×16 под бейджем уровня.
  if (spell.ritual) {
    page.drawSvgPath(BADGE_PATH, {
      x: x + RITUAL.x + RITUAL.offsetX,
      y: yTop - RITUAL.y,
      scale: RITUAL.scale,
      color: paper,
      borderColor: ink,
      borderWidth: 1.31,
    });
    page.drawSvgPath(RITUAL_PATH.d, {
      x: x + RITUAL.x + RITUAL.w / 2,
      y: yTop - (RITUAL.y + RITUAL.h / 2),
      color: ink,
    });
  }

  // Бейдж уровня.
  page.drawSvgPath(BADGE_PATH, {
    x: x + BADGE.x,
    y: yTop - BADGE.y,
    color: ink,
  });
  const innerScale = 0.9;
  page.drawSvgPath(BADGE_PATH, {
    x: x + BADGE.x + (BADGE.w * (1 - innerScale)) / 2,
    y: yTop - BADGE.y - (BADGE.h * (1 - innerScale)) / 2,
    scale: innerScale,
    color: paper,
  });
  const levelGlyph = DIGIT_PATHS[String(spell.level)] ?? DIGIT_PATHS["0"];
  page.drawSvgPath(levelGlyph.d, {
    x: x + BADGE.x + BADGE.w / 2 - (String(spell.level) === "1" ? 0.4 : 0),
    y: yTop - BADGE.y - BADGE.h / 2,
    color: ink,
  });

  for (const line of layout.title.lines) {
    drawRuns(
      page,
      line.runs,
      x + TITLE.x,
      yTop - (TITLE.y + line.y + baselineOffset(fonts, layout.title.size, layout.title.lineHeight)),
      layout.title.size,
      fonts,
      false,
      ink,
      true
    );
  }

  if (layout.components.lines.length) {
    for (const line of layout.components.lines) {
      drawRuns(
        page,
        line.runs,
        x + TITLE.x,
        yTop -
          (TITLE.y +
            layout.componentsTop +
            line.y +
            baselineOffset(fonts, layout.components.size, layout.components.lineHeight)),
        layout.components.size,
        fonts,
        false,
        ink
      );
    }
  }

  layout.range.forEach((cell, index) => {
    const cellX = x + RANGE.x + index * 54.67;
    const width = fonts.boldItalic.widthOfTextAtSize(cell.text, cell.size);
    page.drawText(cell.text, {
      x: cellX + (RANGE.cell - width) / 2,
      y: yTop - (RANGE.y + baselineOffset(fonts, cell.size, RANGE.h)),
      size: cell.size,
      font: fonts.boldItalic,
      color: ink,
    });
  });
  RANGE.sep.forEach((offset) => {
    page.drawRectangle({
      x: x + RANGE.x + offset,
      y: yTop - (RANGE.y + 8.5),
      width: 0.75,
      height: 7,
      color: ink,
    });
  });

  for (const line of layout.body.lines) {
    drawRuns(
      page,
      line.runs,
      x + BODY.x,
      yTop - (BODY.y + line.y + baselineOffset(fonts, layout.body.size, layout.body.lineHeight)),
      layout.body.size,
      fonts,
      true,
      ink
    );
  }

  page.drawRectangle({
    x: x + DIVIDER.x,
    y: yTop - (DIVIDER.y + 1),
    width: DIVIDER.w,
    height: 1,
    color: hexToRgb(theme.accent),
  });

  const footerWidth = fonts.italic.widthOfTextAtSize(layout.footer.text, layout.footer.size);
  page.drawText(layout.footer.text, {
    x: x + (CARD_W - footerWidth) / 2,
    y: yTop - (FOOTER.y + baselineOffset(fonts, layout.footer.size, FOOTER.h)),
    size: layout.footer.size,
    font: fonts.italic,
    color: ink,
  });
}

export async function buildPdf(spells: Spell[], options: PdfOptions = {}): Promise<Uint8Array> {
  await fontsReady();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = await loadFonts(doc);
  const images = new Map<string, PDFImage | null>();

  const perPage = 9;
  const pageCount = Math.max(1, Math.ceil(spells.length / perPage));
  const startX = (A4.w - CARD_W * 3) / 2;
  const startY = (A4.h - CARD_H * 3) / 2;

  for (let p = 0; p < pageCount; p++) {
    const page = doc.addPage([A4.w, A4.h]);
    for (let slot = 0; slot < perPage; slot++) {
      const spell = spells[p * perPage + slot];
      if (!spell) break;
      const col = slot % 3;
      const row = Math.floor(slot / 3);
      await drawCard(doc, page, spell, startX + col * CARD_W, startY + row * CARD_H, fonts, images);
    }

    if (options.cutMarks) {
      const color = rgb(0.82, 0.82, 0.82);
      for (let i = 0; i <= 3; i++) {
        const x = startX + i * CARD_W;
        page.drawLine({
          start: { x, y: 0 },
          end: { x, y: A4.h },
          thickness: 0.5,
          color,
        });
        const y = startY + i * CARD_H;
        page.drawLine({
          start: { x: 0, y: A4.h - y },
          end: { x: A4.w, y: A4.h - y },
          thickness: 0.5,
          color,
        });
      }
    }

    if (options.pageNumbers) {
      const label = `${p + 1} / ${pageCount}`;
      const width = fonts.regular.widthOfTextAtSize(label, 8);
      page.drawText(label, {
        x: (A4.w - width) / 2,
        y: 18,
        size: 8,
        font: fonts.regular,
        color: rgb(0.45, 0.45, 0.45),
      });
    }

    options.onProgress?.(p + 1, pageCount);
  }

  return doc.save();
}

export async function buildPdfBlob(spells: Spell[], options: PdfOptions = {}): Promise<Blob> {
  const bytes = await buildPdf(spells, options);
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

export async function downloadPdf(spells: Spell[], options: PdfOptions = {}): Promise<string | null> {
  const blob = await buildPdfBlob(spells, options);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `pedinburgh-spells-${spells.length}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Ссылка живёт, пока открыта страница — её же использует кнопка «Открыть».
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
  return url;
}
