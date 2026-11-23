let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    ctx = canvas.getContext("2d")!;
  }
  return ctx;
}

/**
 * Ширина строки в пунктах. Меряем при 100px и масштабируем:
 * ширина в pt = ширина при 100px × (size / 100).
 */
export function measure(text: string, size: number, bold = false, italic = false): number {
  if (!text) return 0;
  const key = `${bold ? "b" : "r"}${italic ? "i" : "n"}:${text}`;
  let base = cache.get(key);
  if (base === undefined) {
    const c = getCtx();
    c.font = `${italic ? "italic " : ""}${bold ? 700 : 400} 100px "Alegreya Sans"`;
    base = c.measureText(text).width;
    if (cache.size > 20000) cache.clear();
    cache.set(key, base);
  }
  return (base * size) / 100;
}

let readyPromise: Promise<void> | null = null;
let readyFlag = false;

export function isFontsReady(): boolean {
  return readyFlag;
}

export function fontsReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (typeof document === "undefined") return;
    const specs = [
      '400 9pt "Alegreya Sans"',
      'italic 400 9pt "Alegreya Sans"',
      '700 9pt "Alegreya Sans"',
      'italic 700 9pt "Alegreya Sans"',
      '400 9pt "Manrope"',
      '600 9pt "Manrope"',
      '700 9pt "Manrope"',
      '800 9pt "Manrope"',
    ];
    await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => null)));
    await document.fonts.ready;
    readyFlag = true;
  })();
  return readyPromise;
}
