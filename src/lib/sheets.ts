import Papa from "papaparse";
import { normalizeRows } from "./normalize";
import { SNAPSHOT_FETCHED_AT, SNAPSHOT_SPELLS } from "./snapshot-data";
import type { Spell, SpellRow } from "./types";

const ENV_SHEET = typeof process !== "undefined" ? process.env?.SPELL_SHEET_ID : undefined;

export const SHEET_ID = ENV_SHEET ?? "1Wk1tuAS08KWKEfl1-c4BS9MFO106zhRSI3x69kpiTjA";

const TABS = Array.from({ length: 10 }, (_, i) => `${i} круг`);

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function toRow(row: Record<string, string>, level: number): SpellRow {
  return {
    name: pick(row, "Название заклинания"),
    level,
    ritual: pick(row, "Ритуал"),
    school: pick(row, "Школа"),
    casting: pick(row, "Накладывание"),
    range: pick(row, "Дистанция"),
    duration: pick(row, "Длительность"),
    components: pick(row, "Компоненты"),
    description: pick(row, "Описание"),
    upgrade: pick(row, "Урон на высоких уровнях", "Накладывание более высокой ячейкой"),
    overhaul: pick(row, "Описание (Пединбург)"),
    status: pick(row, "Статус"),
    source: pick(row, "Ссылка"),
    prompt: pick(row, "Promt для иллюстрации"),
  };
}

async function loadTab(level: number): Promise<SpellRow[]> {
  const name = TABS[level];
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    name
  )}`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) spellcards/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Google Sheets ${name}: HTTP ${res.status}`);
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  return parsed.data
    .filter((row) => pick(row, "Название заклинания"))
    .map((row) => toRow(row, level));
}

export interface SheetSnapshot {
  spells: Spell[];
  fetchedAt: number;
  source: "google" | "cache";
  errors: string[];
}

let memory: SheetSnapshot | null = null;
const TTL = 10 * 60 * 1000;

function snapshotFallback(): SheetSnapshot | null {
  if (!SNAPSHOT_SPELLS.length) return null;
  return {
    spells: SNAPSHOT_SPELLS,
    fetchedAt: SNAPSHOT_FETCHED_AT,
    source: "cache",
    errors: [],
  };
}

export async function loadSpells(force = false): Promise<SheetSnapshot> {
  if (!force && memory && Date.now() - memory.fetchedAt < TTL) return memory;

  const errors: string[] = [];
  const rows: SpellRow[] = [];
  const results = await Promise.allSettled(TABS.map((_, level) => loadTab(level)));
  results.forEach((result, level) => {
    if (result.status === "fulfilled") rows.push(...result.value);
    else errors.push(`круг ${level}: ${(result.reason as Error).message}`);
  });

  if (rows.length === 0) {
    const snapshot = memory ?? snapshotFallback();
    if (snapshot) return { ...snapshot, source: "cache", errors };
    throw new Error(`Не удалось прочитать таблицу. ${errors.join("; ")}`);
  }

  const spells = normalizeRows(rows);
  // классы есть только в снимке (спарсены с TTG) — переносим их на свежие данные
  const classesByName = new Map(
    SNAPSHOT_SPELLS.filter((spell) => spell.classes?.length).map((spell) => [spell.name, spell.classes!])
  );
  for (const spell of spells) {
    const classes = classesByName.get(spell.name);
    if (classes) spell.classes = classes;
  }
  memory = { spells, fetchedAt: Date.now(), source: "google", errors };
  return memory;
}
