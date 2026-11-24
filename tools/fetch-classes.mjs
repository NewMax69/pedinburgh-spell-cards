import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/spells.json", "utf8"));
const spells = data.spells;
const results = new Map();
let cursor = 0;
let failed = 0;

async function worker() {
  while (cursor < spells.length) {
    const spell = spells[cursor++];
    if (!spell.source) {
      results.set(spell.id, []);
      continue;
    }
    try {
      const res = await fetch(spell.source, {
        headers: { "user-agent": "Mozilla/5.0", "accept-language": "ru" },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      const html = await res.text();
      const at = html.indexOf("Классы:");
      const slice = at >= 0 ? html.slice(at, at + 1600) : "";
      const names = [...slice.matchAll(/<a href="\/classes\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g)]
        .map((match) =>
          match[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .replace(/\s*\[[^\]]+\]\s*$/, "")
            .trim()
        )
        .filter(Boolean);
      results.set(spell.id, [...new Set(names)]);
    } catch {
      failed++;
      results.set(spell.id, []);
    }
    if (results.size % 40 === 0) console.log("parsed", results.size);
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
for (const spell of spells) spell.classes = results.get(spell.id) ?? [];
writeFileSync("data/spells.json", JSON.stringify(data));
console.log("done:", spells.length, "spells,", spells.filter((s) => s.classes.length).length, "with classes,", failed, "failed");
