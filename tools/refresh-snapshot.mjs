import { writeFileSync } from "node:fs";

const res = await fetch("http://127.0.0.1:3000/api/spells?refresh=1");
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
writeFileSync(
  "data/spells.json",
  JSON.stringify({ spells: data.spells, fetchedAt: data.fetchedAt ?? Date.now() })
);
console.log("spells:", data.spells.length, "first:", data.spells[0]?.name);
