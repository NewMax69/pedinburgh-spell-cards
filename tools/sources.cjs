const fs = require("fs");
const d = JSON.parse(fs.readFileSync("data/spells.json", "utf8"));
const withSource = d.spells.filter(s => s.source);
const hosts = {};
for (const s of withSource) { try { const h = new URL(s.source).host; hosts[h] = (hosts[h]||0)+1; } catch {} }
console.log("with source", withSource.length, JSON.stringify(hosts));
console.log(withSource.slice(0, 3).map(s => s.name + " -> " + s.source).join("\n"));
