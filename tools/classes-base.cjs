const fs = require("fs");
const d = JSON.parse(fs.readFileSync("data/spells.json", "utf8"));
const BASE = new Set(["Варвар","Бард","Жрец","Друид","Воин","Монах","Паладин","Следопыт","Плут","Чародей","Колдун","Волшебник","Изобретатель"]);
let kept = 0, lost = 0;
for (const s of d.spells) {
  const next = (s.classes || []).filter(c => BASE.has(c));
  if ((s.classes || []).length && !next.length) lost++;
  s.classes = next;
  if (next.length) kept++;
}
fs.writeFileSync("data/spells.json", JSON.stringify(d));
const all = new Set(d.spells.flatMap(s => s.classes));
console.log("kept", kept, "lost", lost, "classes", [...all].sort().join(", "));
