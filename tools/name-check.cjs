const fs = require("fs");
const d = JSON.parse(fs.readFileSync("data/spells.json", "utf8"));
const wanted = ["Брызги кислоты","Безмолвный образ","Благословение","Огненный шар","Желание","Малая иллюзия","Дружба","Щит","Лечение ран","Телепортация","Радужная стена"];
const names = new Set(d.spells.map(s => s.name));
const found = wanted.filter(n => names.has(n));
const missing = wanted.filter(n => !names.has(n));
fs.writeFileSync("ref/name-check.json", JSON.stringify({ count: d.spells.length, found, missing, sample: d.spells.slice(0,8).map(s=>s.name) }, null, 1), "utf8");
console.log("found", found.length, "missing", missing.length);
