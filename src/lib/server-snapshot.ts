import { SNAPSHOT_FETCHED_AT, SNAPSHOT_SPELLS } from "./snapshot-data";
import type { Spell } from "./types";

export interface Snapshot {
  spells: Spell[];
  fetchedAt: number;
}

export async function loadSnapshot(): Promise<Snapshot> {
  return { spells: SNAPSHOT_SPELLS, fetchedAt: SNAPSHOT_FETCHED_AT };
}
