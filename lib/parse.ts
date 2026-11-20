// Reine Eingabe-Parser (ohne Next/Supabase), damit sie einzeln testbar sind.
// Wird von lib/actions.ts (Server Actions) genutzt.

import type { Field } from "./schema";

export const MONEY_MAX = 9_999_999;

/**
 * Liest eine Zahl in deutscher (bevorzugt) oder englischer Schreibweise.
 * - "1.250,50" / "1250,5" / "€ 100" / "100 €" / "100 EUR"
 * - "1,250.50" (englisch): das zuletzt stehende Trennzeichen ist das Dezimalzeichen
 * - "1.250" / "1.250.000" (nur Punkte in 3er-Gruppen) = Tausendertrennzeichen
 * - "12.5" / "12.50" (ein Punkt, nicht 3 Nachkommastellen) = Dezimalpunkt
 * Gibt null für leere Eingabe und NaN für ungültige Eingabe zurück.
 */
export function parseNumber(raw: string): number | null {
  const r = parseNumberDetailed(raw);
  return r === null ? null : r.n;
}

/** Wie parseNumber, liefert zusätzlich die Anzahl eingegebener Nachkommastellen. */
function parseNumberDetailed(raw: string): { n: number; fracDigits: number } | null {
  let s = String(raw ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/€|eur(o)?/gi, "")
    .replace(/[−–]/g, "-") // typografisches Minus
    .replace(/,-{1,2}$/, ""); // "100,-"
  if (s === "") return null;

  let sign = "";
  if (s.startsWith("-") || s.startsWith("+")) {
    sign = s[0] === "-" ? "-" : "";
    s = s.slice(1);
  }
  const bad = { n: NaN, fracDigits: 0 };
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return bad;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart = s;
  let frac = "";
  let thousandsSep: string | null = null;

  if (lastComma !== -1 && lastDot !== -1) {
    // Beide vorhanden: das hintere ist das Dezimalzeichen.
    const dec = lastComma > lastDot ? "," : ".";
    thousandsSep = dec === "," ? "." : ",";
    const i = s.lastIndexOf(dec);
    intPart = s.slice(0, i);
    frac = s.slice(i + 1);
    if (frac.includes(thousandsSep) || frac.includes(dec)) return bad;
  } else if (lastComma !== -1) {
    const n = s.split(",").length - 1;
    if (n === 1) {
      // Deutsch: Komma = Dezimalzeichen
      intPart = s.slice(0, lastComma);
      frac = s.slice(lastComma + 1);
    } else {
      thousandsSep = ","; // "1,250,000"
    }
  } else if (lastDot !== -1) {
    const n = s.split(".").length - 1;
    const after = s.slice(lastDot + 1);
    if (n > 1 || (after.length === 3 && /^[1-9]\d{0,2}\.\d{3}$/.test(s))) {
      thousandsSep = "."; // "1.250" oder "1.250.000"
    } else {
      intPart = s.slice(0, lastDot);
      frac = after;
    }
  }

  if (thousandsSep) {
    const groups = intPart.split(thousandsSep);
    if (!/^[1-9]\d{0,2}$/.test(groups[0]) || groups.slice(1).some((g) => !/^\d{3}$/.test(g))) return bad;
    intPart = groups.join("");
  }
  if (intPart === "") intPart = "0"; // ",50" → 0,50
  if (!/^\d+$/.test(intPart) || (frac !== "" && !/^\d+$/.test(frac))) return bad;
  if (s.endsWith(",") || s.endsWith(".")) return bad;

  const n = Number(`${sign}${intPart}${frac ? "." + frac : ""}`);
  return { n: n === 0 ? 0 : n, fracDigits: frac.length }; // kein -0
}

/** Strenges Kalenderdatum YYYY-MM-DD (kein 31.02.). */
export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Uhrzeit HH:MM oder HH:MM:SS mit gültigen Bereichen. */
export function isValidTime(s: string, allowSeconds = true): boolean {
  const m = (allowSeconds ? /^(\d{2}):(\d{2})(?::(\d{2}))?$/ : /^(\d{2}):(\d{2})$/).exec(s);
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59 && (m[3] === undefined || Number(m[3]) <= 59);
}

/** Normalisiert einen Link auf http(s). Ohne Protokoll wird https:// ergänzt. null = ungültig. */
export function normalizeUrl(raw: string): string | null {
  const str = raw.trim();
  if (str === "" || /\s/.test(str)) return null;
  // Ein anderes Schema (javascript:, data:, mailto: …) nicht stillschweigend in https:// umbiegen.
  if (/^[a-z][a-z0-9+.-]*:/i.test(str) && !/^https?:\/\//i.test(str) && !/^[^:/]+:\d+(\/|$)/.test(str)) return null;
  const withProto = /^https?:\/\//i.test(str) ? str : `https://${str}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export type ParseResult = { value: unknown } | { error: string };

export function parseField(f: Field, raw: string | boolean | null | undefined): ParseResult {
  if (f.type === "bool") return { value: raw === true || raw === "on" || raw === "true" };

  const str = typeof raw === "string" ? raw.trim() : "";
  if (str === "") {
    if (f.required) return { error: `„${f.label}“ darf nicht leer sein.` };
    if (f.zero) return { value: 0 };
    return { value: null };
  }
  if (str.length > 5000) return { error: `„${f.label}“ ist zu lang.` };

  switch (f.type) {
    case "money":
    case "number": {
      const parsed = parseNumberDetailed(str);
      const n = parsed?.n ?? NaN;
      if (Number.isNaN(n)) return { error: `„${f.label}“ ist keine gültige Zahl.` };
      const min = f.min ?? 0;
      if (n < min) return { error: `„${f.label}“ darf nicht kleiner als ${min} sein.` };
      if (f.max !== undefined && n > f.max) return { error: `„${f.label}“ darf höchstens ${f.max} sein.` };
      if (f.type === "money" && n > MONEY_MAX) return { error: `„${f.label}“ ist unrealistisch hoch.` };
      if (!Number.isFinite(n)) return { error: `„${f.label}“ ist keine gültige Zahl.` };
      if (f.integer) {
        // "1,000" wäre deutsch 1 und englisch 1000 → lieber nachfragen.
        if (!Number.isInteger(n) || (parsed?.fracDigits ?? 0) > 2) return { error: `„${f.label}“ muss eine ganze Zahl sein.` };
        return { value: n };
      }
      if ((parsed?.fracDigits ?? 0) > 2) return { error: `„${f.label}“: bitte höchstens 2 Nachkommastellen (Cent).` };
      return { value: Math.round(n * 100) / 100 };
    }
    case "date":
      if (!isValidDate(str)) return { error: `„${f.label}“ ist kein gültiges Datum.` };
      return { value: str };
    case "time":
      if (!isValidTime(str)) return { error: `„${f.label}“ ist keine gültige Uhrzeit.` };
      return { value: str };
    case "url": {
      const u = normalizeUrl(str);
      return u ? { value: u } : { error: `„${f.label}“ ist kein gültiger Link.` };
    }
    case "select":
      if (f.options && !f.options.includes(str)) return { error: `„${f.label}“: ungültige Auswahl.` };
      return { value: str };
    default:
      return { value: str };
  }
}

export function buildRowFromFields(
  fields: readonly Field[],
  values: Record<string, string | boolean | null | undefined>,
): { row: Record<string, unknown> } | { error: string } {
  const row: Record<string, unknown> = {};
  for (const f of fields) {
    const r = parseField(f, values?.[f.key]);
    if ("error" in r) return { error: r.error };
    row[f.key] = r.value;
  }
  return { row };
}

/** Gesamtbudget: Betrag ≥ 0, höchstens MONEY_MAX, höchstens 2 Nachkommastellen. */
export function parseMoneyTotal(raw: string): number | null {
  const r = parseNumberDetailed(raw);
  if (r === null) return null;
  const n = r.n;
  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0 || n > MONEY_MAX || r.fracDigits > 2) return null;
  return Math.round(n * 100) / 100;
}

/** Prüft und normalisiert die Einstellungen der Gästeseite. Nur bekannte Schlüssel, nur übergebene Felder. */
export function buildSettingsRows(
  settingKeys: readonly string[],
  values: Record<string, unknown>,
): { rows: { key: string; value: string }[] } | { error: string } {
  const rows: { key: string; value: string }[] = [];
  if (!values || typeof values !== "object") return { error: "Ungültige Eingabe." };
  for (const key of settingKeys) {
    if (!Object.hasOwn(values, key)) continue;
    const v = String(values[key] ?? "").trim();
    if (v.length > 5000) return { error: "Ein Text ist zu lang." };
    if (/url$/.test(key) && v) {
      const u = normalizeUrl(v);
      if (!u) return { error: "Ein Link ist ungültig." };
      rows.push({ key, value: u });
      continue;
    }
    if ((key === "wedding_date" || key === "rsvp_deadline") && v && !isValidDate(v)) return { error: "Ungültiges Datum." };
    if (key === "wedding_time" && v && !isValidTime(v, false)) return { error: "Ungültige Uhrzeit." };
    rows.push({ key, value: v });
  }
  return { rows };
}
