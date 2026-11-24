const d = require("../data/spells.json");
console.log("count", d.spells.length);
console.log(d.spells.filter(s => /Ядов|шок|Электр/i.test(s.name)).map(s => s.name + "=" + s.id).join("; "));
console.log(d.spells.slice(0, 5).map(s => s.name).join(" | "));
