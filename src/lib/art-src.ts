import { placeholderArt } from "./art";
import { getImage } from "./idb";
import { normalizeSchool } from "./schools";
import type { Spell } from "./types";

export async function resolveArtSrc(spell: Spell): Promise<string> {
  const school = normalizeSchool(spell.school) ?? "Воплощение";
  if (!spell.image) return placeholderArt(spell.name, school);
  if (spell.image.startsWith("idb:")) {
    const data = await getImage(spell.image.slice(4));
    return data ?? placeholderArt(spell.name, school);
  }
  return spell.image;
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
