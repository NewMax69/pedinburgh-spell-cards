const fs = require("fs");

const file = "src/components/catalog/catalog-view.tsx";
let source = fs.readFileSync(file, "utf8");
const block = fs.readFileSync("tools/new-toolbar.txt", "utf8");

const startMarker = '            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />';
const endMarker = "\n          {advancedOpen ? (";

const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);
if (start < 0 || end < 0 || end < start) {
  console.error("markers not found", start, end);
  process.exit(1);
}
source = source.slice(0, start) + block + source.slice(end + 1);
fs.writeFileSync(file, source);
console.log("patched toolbar", start, end);
