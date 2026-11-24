export type Units = "m" | "ft";

const FT_PER_M = 3.28084;

function metersWord(value: number): string {
  if (Math.abs(value - 1) < 0.01) return "метр";
  if (Math.abs(value % 1) > 0.01) return "метра";
  return "метров";
}

/** «18 метров» → «60 футов»; остальное без изменений. */
export function toFeet(text: string): string {
  const meters = text.match(/^([\d.,]+)\s*метр/i);
  if (meters) {
    const value = Number(meters[1].replace(",", "."));
    const feet = Math.max(5, Math.round((value * FT_PER_M) / 5) * 5);
    return `${feet} футов`;
  }
  const km = text.match(/^([\d.,]+)\s*км/i);
  if (km) {
    const value = Number(km[1].replace(",", "."));
    const miles = Math.round((value / 1.60934) * 10) / 10;
    return `${String(miles).replace(".", ",")} мили`;
  }
  return text;
}

/** «60 футов» → «18 метров»; остальное без изменений. */
export function toMeters(text: string): string {
  const feet = text.match(/^([\d\s]+)\s*фут/i);
  if (feet) {
    const value = Number(feet[1].replace(/\s/g, ""));
    const meters = Math.round((value / FT_PER_M) * 2) / 2;
    return `${String(meters).replace(".", ",")} ${metersWord(meters)}`;
  }
  const miles = text.match(/^([\d.,]+)\s*мил/i);
  if (miles) {
    const value = Number(miles[1].replace(",", "."));
    const km = Math.round(value * 1.60934 * 10) / 10;
    return `${String(km).replace(".", ",")} км`;
  }
  return text;
}

export function convertRange(text: string, units: Units): string {
  return units === "ft" ? toFeet(text) : text;
}
