import { normalizeSchool, type School } from "./schools";
import {
  castingShort,
  cleanName,
  componentsText,
  durationShort,
  isRitual,
  mapStatus,
  parseBody,
  rangeShort,
  slugify,
  splitTitle,
} from "./text";
import type { Spell, SpellRow } from "./types";

export function normalizeSpell(row: SpellRow): Spell | null {
  const name = cleanName(row.name);
  if (!name || /\?\?\?$/.test(row.name ?? "")) return null;

  const school = normalizeSchool(row.school);
  if (!school || !row.casting) return null;

  const source = (row.overhaul ?? "").trim() || (row.description ?? "").trim();
  const parsed = parseBody(source);

  let upgrade = parsed.upgrade;
  const extraUpgrade = (row.upgrade ?? "").trim();
  // Колонку «урон/ячейка выше» добавляем только если в описании нет своего блока.
  if (!upgrade && extraUpgrade && extraUpgrade !== "—") {
    upgrade = /^на высоких уровнях/i.test(extraUpgrade)
      ? extraUpgrade
      : `На высоких уровнях: ${extraUpgrade}`;
  }

  const { title, alt } = splitTitle(name);
  const level = Number(row.level) || 0;
  const ritual = isRitual(row);

  return {
    id: `${level}-${slugify(name)}`,
    name,
    level,
    school,
    ritual,
    casting: castingShort(row.casting),
    range: rangeShort(row.range),
    duration: durationShort(row.duration),
    components: componentsText(row.components),
    art: parsed.art,
    body: parsed.body,
    upgrade,
    official: (row.description ?? "").trim() || undefined,
    status: mapStatus(row.status),
    source: row.source || undefined,
    ...(alt ? { altName: alt } : {}),
  };
}

export function normalizeRows(rows: SpellRow[]): Spell[] {
  const seen = new Set<string>();
  const out: Spell[] = [];
  for (const row of rows) {
    const spell = normalizeSpell(row);
    if (!spell) continue;
    let id = spell.id;
    let i = 2;
    while (seen.has(id)) {
      id = `${spell.id}-${i++}`;
    }
    seen.add(id);
    out.push({ ...spell, id });
  }
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ru"));
}

export function schoolOf(spell: Spell): School | null {
  return normalizeSchool(spell.school);
}
