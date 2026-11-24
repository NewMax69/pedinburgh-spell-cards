const fs = require("fs");
const d = JSON.parse(fs.readFileSync("ref/api-live.json", "utf8"));
const withClasses = d.spells.filter(s => (s.classes||[]).length).length;
console.log("with classes", withClasses, "first", d.spells[0].name, JSON.stringify(d.spells[0].classes));
