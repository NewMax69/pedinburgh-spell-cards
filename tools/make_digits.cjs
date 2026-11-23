const fs = require("fs");
const fontkit = require("@pdf-lib/fontkit");

const font = fontkit.create(fs.readFileSync("public/fonts/AlegreyaSans-Bold.ttf"));
const UPEM = font.unitsPerEm;

function glyphPath(glyph, size) {
  const bbox = glyph.bbox;
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const s = size / UPEM;
  const fmt = (n) => (Math.round(n * 100) / 100).toString();
  const parts = [];
  const px = (x) => (x - cx) * s;
  const py = (y) => -(y - cy) * s;
  for (const cmd of glyph.path.commands) {
    const a = cmd.args;
    switch (cmd.command) {
      case "moveTo":
        parts.push(`M${fmt(px(a[0]))} ${fmt(py(a[1]))}`);
        break;
      case "lineTo":
        parts.push(`L${fmt(px(a[0]))} ${fmt(py(a[1]))}`);
        break;
      case "quadraticCurveTo":
        parts.push(`Q${fmt(px(a[0]))} ${fmt(py(a[1]))} ${fmt(px(a[2]))} ${fmt(py(a[3]))}`);
        break;
      case "bezierCurveTo":
        parts.push(
          `C${fmt(px(a[0]))} ${fmt(py(a[1]))} ${fmt(px(a[2]))} ${fmt(py(a[3]))} ${fmt(px(a[4]))} ${fmt(py(a[5]))}`
        );
        break;
      case "closePath":
        parts.push("Z");
        break;
      default:
        break;
    }
  }
  return { d: parts.join(""), box: { w: (bbox.maxX - bbox.minX) * s, h: (bbox.maxY - bbox.minY) * s } };
}

function makeSet(chars, size, features) {
  const out = {};
  for (const ch of chars) {
    const run = font.layout(ch, features);
    const glyph = run.glyphs[0];
    out[ch] = glyphPath(glyph, size);
  }
  return out;
}

const digits = makeSet("0123456789", 15, ["lnum", "tnum"]);
const defaultDigits = makeSet("0123456789", 15, []);
const r = makeSet("Р", 12, []);

console.log("default 3 box", defaultDigits["3"].box, "lnum 3 box", digits["3"].box);
console.log("default 0 box", defaultDigits["0"].box, "lnum 0 box", digits["0"].box);
console.log("P box", r["Р"].box);

const header = `// Сгенерировано tools/make_digits.cjs — контуры цифр Alegreya Sans Bold (lining)\nexport interface GlyphPath { d: string; box: { w: number; h: number } }\n\n`;
let body = "export const DIGIT_PATHS: Record<string, GlyphPath> = {\n";
for (const [ch, v] of Object.entries(digits)) {
  body += `  "${ch}": { d: ${JSON.stringify(v.d)}, box: { w: ${Math.round(v.box.w * 100) / 100}, h: ${Math.round(v.box.h * 100) / 100} } },\n`;
}
body += "};\n\nexport const RITUAL_PATH: GlyphPath = { d: " + JSON.stringify(r["Р"].d) + ", box: { w: " + Math.round(r["Р"].box.w * 100) / 100 + ", h: " + Math.round(r["Р"].box.h * 100) / 100 + " } };\n";
fs.writeFileSync("src/lib/digit-paths.ts", header + body);
console.log("written src/lib/digit-paths.ts");
