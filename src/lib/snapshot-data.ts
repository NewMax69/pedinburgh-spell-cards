import raw from "../../data/spells.json";
import type { Spell } from "./types";

interface RawSnapshot {
  spells?: Spell[];
  fetchedAt?: number;
}

const data = raw as unknown as RawSnapshot;

/** Снимок таблицы, вшитый в бандл при сборке (работает без файловой системы). */
export const SNAPSHOT_SPELLS: Spell[] = Array.isArray(data.spells) ? data.spells : [];
export const SNAPSHOT_FETCHED_AT: number = data.fetchedAt ?? 0;
