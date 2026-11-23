const fk = require("@pdf-lib/fontkit");
const fs = require("fs");
for (const name of ["AlegreyaSans-Bold.ttf", "AlegreyaSans-Regular.ttf"]) {
  const font = fk.create(fs.readFileSync("public/fonts/" + name));
  console.log(name, {
    upem: font.unitsPerEm,
    ascent: font.ascent,
    descent: font.descent,
    capHeight: font.capHeight,
    xHeight: font.xHeight,
    lineGap: font.lineGap,
  });
}
