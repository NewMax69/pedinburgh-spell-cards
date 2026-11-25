const fs = require("fs");
const source = fs.readFileSync("src/lib/digit-paths.ts", "utf8");
const match = source.match(/"1": \{ d: "([^"]+)"/);
if (!match) throw new Error("no 1");

const tokens = match[1].match(/[MLQCZ]|-?\d+(?:\.\d+)?/g);
let x = 0;
let y = 0;
const segments = [];
let cmd = null;
const args = [];
for (const token of tokens) {
  if (/^[MLQCZ]$/.test(token)) {
    if (cmd) segments.push({ cmd, args: [...args] });
    cmd = token;
    args.length = 0;
  } else {
    args.push(Number(token));
  }
}
if (cmd) segments.push({ cmd, args });

const verticals = [];
let cx = 0;
let cy = 0;
for (const seg of segments) {
  if (seg.cmd === "M") {
    cx = seg.args[0];
    cy = seg.args[1];
  } else if (seg.cmd === "L") {
    const nx = seg.args[0];
    const ny = seg.args[1];
    if (Math.abs(nx - cx) < 0.05 && Math.abs(ny - cy) > 1) verticals.push({ x: cx, len: Math.abs(ny - cy) });
    cx = nx;
    cy = ny;
  } else if (seg.cmd === "Q") {
    cx = seg.args[2];
    cy = seg.args[3];
  } else if (seg.cmd === "C") {
    cx = seg.args[4];
    cy = seg.args[5];
  }
}
verticals.sort((a, b) => b.len - a.len);
console.log(verticals.slice(0, 6));
const stem = verticals.slice(0, 2);
if (stem.length === 2) console.log("stem center x =", ((stem[0].x + stem[1].x) / 2).toFixed(2));
