const fs = require("fs");

const source = fs.readFileSync("src/lib/digit-paths.ts", "utf8");
for (const digit of "0123456789") {
  const match = source.match(new RegExp(`"${digit}": \\{ d: "([^"]+)"`));
  if (!match) continue;
  const nums = [...match[1].matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const xs = [];
  const ys = [];
  for (let i = 0; i < nums.length; i += 2) {
    xs.push(nums[i]);
    ys.push(nums[i + 1]);
  }
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(
    digit,
    "x",
    Math.min(...xs).toFixed(2),
    Math.max(...xs).toFixed(2),
    "mean",
    meanX.toFixed(2),
    "y",
    Math.min(...ys).toFixed(2),
    Math.max(...ys).toFixed(2)
  );
}
