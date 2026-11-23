const fs = require("fs");
const path = require("path");
const files = {
  "AlegreyaSans-Regular.ttf": "ofl/alegreyasans/AlegreyaSans-Regular.ttf",
  "AlegreyaSans-Italic.ttf": "ofl/alegreyasans/AlegreyaSans-Italic.ttf",
  "AlegreyaSans-Bold.ttf": "ofl/alegreyasans/AlegreyaSans-Bold.ttf",
  "AlegreyaSans-BoldItalic.ttf": "ofl/alegreyasans/AlegreyaSans-BoldItalic.ttf",
  "AlegreyaSans-Medium.ttf": "ofl/alegreyasans/AlegreyaSans-Medium.ttf",
  "Manrope.ttf": "ofl/manrope/Manrope%5Bwght%5D.ttf",
};
(async () => {
  fs.mkdirSync("public/fonts", { recursive: true });
  for (const [name, rel] of Object.entries(files)) {
    const url = `https://raw.githubusercontent.com/google/fonts/main/${rel}`;
    const r = await fetch(url);
    console.log(name, r.status);
    if (!r.ok) continue;
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join("public/fonts", name), b);
    console.log("  ", b.length);
  }
})();
