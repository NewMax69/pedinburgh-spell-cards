"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Spell } from "./types";
import type { Units } from "./units";

const KEYS = {
  spells: "pedinburgh:spells",
  selection: "pedinburgh:selection",
  custom: "pedinburgh:customCards",
  drive: "pedinburgh:driveFolder",
  driveImages: "pedinburgh:driveImages",
  units: "pedinburgh:units",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

/* ------------------------------- spells -------------------------------- */

interface CachedSpells {
  spells: Spell[];
  fetchedAt: number;
}

let spellsMemory: CachedSpells | null = null;

export function useSpells(initial?: Spell[]) {
  const [spells, setSpells] = useState<Spell[]>(() => initial ?? spellsMemory?.spells ?? []);
  const [loading, setLoading] = useState(() => !initial?.length && !spellsMemory);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"google" | "cache" | "local" | null>(
    initial?.length ? "local" : null
  );
  const [fetchedAt, setFetchedAt] = useState<number>(0);

  const apply = useCallback((next: Spell[], at: number, from: "google" | "cache" | "local") => {
    spellsMemory = { spells: next, fetchedAt: at };
    setSpells(next);
    setFetchedAt(at);
    setSource(from);
  }, []);

  const fetchSpells = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/spells${force ? "?refresh=1" : ""}`, { cache: "no-store" });
        const data = (await res.json()) as {
          spells?: Spell[];
          fetchedAt?: number;
          source?: "google" | "cache";
          error?: string;
        };
        if (!res.ok || !data.spells?.length) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        apply(data.spells, data.fetchedAt ?? Date.now(), data.source ?? "google");
        write(KEYS.spells, { spells: data.spells, fetchedAt: data.fetchedAt ?? Date.now() });
      } catch (err) {
        const cached = read<CachedSpells | null>(KEYS.spells, null);
        if (cached?.spells?.length) {
          apply(cached.spells, cached.fetchedAt, "cache");
        }
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [apply]
  );

  useEffect(() => {
    if (initial?.length) {
      spellsMemory = spellsMemory ?? { spells: initial, fetchedAt: Date.now() };
      setLoading(false);
      fetchSpells().catch(() => undefined);
      return;
    }
    const cached = read<CachedSpells | null>(KEYS.spells, null);
    if (cached?.spells?.length) {
      apply(cached.spells, cached.fetchedAt, "local");
      setLoading(false);
      fetchSpells().catch(() => undefined);
    } else {
      fetchSpells().catch(() => undefined);
    }
  }, [apply, fetchSpells]);

  return { spells, loading, error, source, fetchedAt, refresh: () => fetchSpells(true) };
}

/* ------------------------------ selection ------------------------------ */

const EMPTY_IDS: string[] = [];
let selectionState: string[] | null = null;
const selectionListeners = new Set<() => void>();

function ensureSelection(): string[] {
  if (!selectionState) selectionState = read<string[]>(KEYS.selection, []);
  return selectionState;
}

function subscribeSelection(cb: () => void) {
  selectionListeners.add(cb);
  return () => {
    selectionListeners.delete(cb);
  };
}

function getSelectionSnapshot() {
  return ensureSelection();
}

function updateSelection(next: string[]) {
  selectionState = next;
  write(KEYS.selection, next);
  selectionListeners.forEach((listener) => listener());
}

export function useSelection() {
  const ids = useSyncExternalStore(subscribeSelection, getSelectionSnapshot, () => EMPTY_IDS);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const current = ensureSelection();
    updateSelection(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const add = useCallback((id: string) => {
    const current = ensureSelection();
    if (!current.includes(id)) updateSelection([...current, id]);
  }, []);

  const addMany = useCallback((ids: string[]) => {
    const current = ensureSelection();
    const seen = new Set(current);
    const next = [...current];
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        next.push(id);
      }
    }
    updateSelection(next);
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    const current = ensureSelection();
    if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateSelection(next);
  }, []);

  const remove = useCallback((id: string) => {
    updateSelection(ensureSelection().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => updateSelection([]), []);

  const move = useCallback((id: string, direction: -1 | 1) => {
    const current = ensureSelection();
    const index = current.indexOf(id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    updateSelection(next);
  }, []);

  return useMemo(
    () => ({
      ids,
      count: ids.length,
      pages: Math.max(1, Math.ceil(ids.length / 9)),
      has,
      toggle,
      add,
      addMany,
      reorder,
      remove,
      clear,
      move,
    }),
    [ids, has, toggle, add, addMany, reorder, remove, clear, move]
  );
}

/* ------------------------------ custom cards --------------------------- */

const EMPTY_CARDS: Spell[] = [];
let customState: Spell[] | null = null;
const customListeners = new Set<() => void>();

function ensureCustom(): Spell[] {
  if (!customState) customState = read<Spell[]>(KEYS.custom, []);
  return customState;
}

function subscribeCustom(cb: () => void) {
  customListeners.add(cb);
  return () => {
    customListeners.delete(cb);
  };
}

function getCustomSnapshot() {
  return ensureCustom();
}

function updateCustom(next: Spell[]) {
  customState = next;
  write(KEYS.custom, next);
  customListeners.forEach((listener) => listener());
}

export function useCustomCards() {
  const cards = useSyncExternalStore(subscribeCustom, getCustomSnapshot, () => EMPTY_CARDS);

  const upsert = useCallback(
    (card: Spell) => {
      const next = [
        ...ensureCustom().filter((c) => c.id !== card.id),
        { ...card, custom: true, updatedAt: Date.now() },
      ].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      updateCustom(next);
    },
    []
  );

  const remove = useCallback((id: string) => {
    updateCustom(ensureCustom().filter((c) => c.id !== id));
  }, []);

  const replaceAll = useCallback((next: Spell[]) => {
    updateCustom(next.map((c) => ({ ...c, custom: true })));
  }, []);

  return { cards, upsert, remove, replaceAll };
}

/* ------------------------------- helpers ------------------------------- */

const EMPTY_DRIVE: Record<string, string> = {};
let driveState: Record<string, string> | null = null;
const driveListeners = new Set<() => void>();

function ensureDrive(): Record<string, string> {
  if (!driveState) driveState = read<Record<string, string>>(KEYS.driveImages, {});
  return driveState;
}

function subscribeDrive(cb: () => void) {
  driveListeners.add(cb);
  return () => {
    driveListeners.delete(cb);
  };
}

function getDriveSnapshot() {
  return ensureDrive();
}

export function useDriveImages() {
  const map = useSyncExternalStore(subscribeDrive, getDriveSnapshot, () => EMPTY_DRIVE);

  const replace = useCallback((next: Record<string, string>) => {
    driveState = next;
    write(KEYS.driveImages, next);
    driveListeners.forEach((listener) => listener());
  }, []);

  const clear = useCallback(() => replace({}), [replace]);

  const remove = useCallback(
    (id: string) => {
      const current = ensureDrive();
      if (!(id in current)) return;
      const next = { ...current };
      delete next[id];
      replace(next);
    },
    [replace]
  );

  return { map, replace, clear, remove };
}

export function applyDriveImages(spells: Spell[], map: Record<string, string>): Spell[] {
  if (!Object.keys(map).length) return spells;
  return spells.map((spell) => (map[spell.id] && !spell.image ? { ...spell, image: map[spell.id] } : spell));
}

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function emptySpell(level = 1): Spell {
  return {
    id: `custom-${Math.random().toString(36).slice(2, 10)}`,
    name: "Новое заклинание",
    level,
    school: "Воплощение",
    ritual: false,
    casting: "Действие",
    range: "18 метров",
    duration: "Мгновенно",
    components: "В, С",
    art: "",
    body: ["Опиши механику заклинания."],
    upgrade: "",
    status: "edited",
    custom: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function levelText(level: number): string {
  return level === 0 ? "Заговор" : `${level} круг`;
}

/* --------------------------------- units --------------------------------- */

let unitsState: Units | null = null;
const unitsListeners = new Set<() => void>();

function ensureUnits(): Units {
  if (!unitsState) unitsState = read<Units>(KEYS.units, "m");
  return unitsState;
}

function subscribeUnits(callback: () => void) {
  unitsListeners.add(callback);
  return () => {
    unitsListeners.delete(callback);
  };
}

export function useUnits() {
  const units = useSyncExternalStore(subscribeUnits, ensureUnits, () => "m" as Units);
  const setUnits = useCallback((next: Units) => {
    unitsState = next;
    write(KEYS.units, next);
    unitsListeners.forEach((listener) => listener());
  }, []);
  return { units, setUnits };
}

export function getUnits(): Units {
  if (typeof window === "undefined") return "m";
  return ensureUnits();
}

export { KEYS as STORAGE_KEYS };
