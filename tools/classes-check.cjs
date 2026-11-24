const fs = require("fs");
const d = JSON.parse(fs.readFileSync("data/spells.json", "utf8"));
const all = new Set(d.spells.flatMap(s => s.classes || []));
const out = {
  total: d.spells.length,
  withClasses: d.spells.filter(s => (s.classes||[]).length).length,
  classes: [...all].sort((a,b)=>a.localeCompare(b,"ru")),
  samples: d.spells.slice(0, 5).map(s => ({ name: s.name, classes: s.classes })),
};
fs.writeFileSync("ref/classes-check.json", JSON.stringify(out, null, 1), "utf8");
console.log("classes", all.size, "with", out.withClasses);
