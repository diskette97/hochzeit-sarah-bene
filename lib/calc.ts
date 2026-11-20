// Reine Rechenfunktionen (ohne Datenbank/Framework), damit sie einzeln testbar sind.

export type Num = number | string | null | undefined;

/** Wandelt DB-Werte (numeric kommt als string oder number) sicher in eine Zahl. */
export function toNum(v: Num): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Betrag in ganzen Cent (kaufmännisch gerundet, symmetrisch für negative Werte). */
function toCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const c = Math.round(Math.abs(n) * 100 + 1e-7) * Math.sign(n); // 1.005 → 101 statt 100
  return c === 0 ? 0 : c; // kein -0
}

/** Rundet auf Cent, um Gleitkomma-Fehler beim Summieren zu vermeiden. */
export function cents(n: number): number {
  const c = toCents(n) / 100;
  return c === 0 ? 0 : c;
}

/** Summe, exakt in ganzen Cent gerechnet. */
export function sum(values: Num[]): number {
  return cents(values.reduce<number>((acc, v) => acc + toCents(toNum(v)), 0) / 100);
}

export type BudgetRow = { planned: Num; actual: Num; paid: Num; status?: string | null };

/** Maßgeblicher Betrag eines Postens: tatsächlicher Betrag/Angebot, sonst Plan. */
export function effectiveAmount(r: BudgetRow): number {
  return r.actual === null || r.actual === undefined || r.actual === "" ? toNum(r.planned) : toNum(r.actual);
}

export function budgetSummary(rows: BudgetRow[], totalBudget: Num) {
  const total = cents(toNum(totalBudget));
  const planned = sum(rows.map((r) => r.planned));
  const expected = sum(rows.map((r) => effectiveAmount(r)));
  const paid = sum(rows.map((r) => r.paid));
  // Offen je Posten: Überzahlung bei einem Posten darf offene Beträge anderer Posten nicht verdecken.
  const openToPay = sum(rows.map((r) => Math.max(effectiveAmount(r) - toNum(r.paid), 0)));
  return {
    total,
    planned,
    expected,
    paid,
    openToPay,
    remaining: cents(total - expected),
    overBudget: total > 0 && expected > total,
    usedPercent: total > 0 ? Math.min(Math.round((expected / total) * 100), 999) : 0,
  };
}

export function taskProgress(rows: { done: boolean }[]) {
  const total = rows.length;
  const done = rows.filter((r) => r.done).length;
  // Abrunden, damit 199/200 nicht als „100 %“ erscheint.
  return { total, done, open: total - done, percent: total === 0 ? 0 : Math.floor((done / total) * 100) };
}

/** Kalendertage von `today` bis `target` (beides YYYY-MM-DD). Negativ = vorbei. */
export function daysBetween(today: string, target: string): number {
  // UTC-Mitternacht beider Kalendertage → unabhängig von Sommer-/Winterzeit.
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = target.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

/** Heutiges Datum in Berlin als YYYY-MM-DD. */
export function todayBerlin(now: Date = new Date()): string {
  // formatToParts statt format("en-CA"): unabhängig davon, wie die ICU-Version das Locale formatiert.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function daysUntilWedding(weddingDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!weddingDate || !isCalendarDate(weddingDate)) return null;
  return daysBetween(todayBerlin(now), weddingDate);
}

export type GuestRow = { rsvp: string; persons: Num; invited?: boolean; priority?: string };

export function guestSummary(rows: GuestRow[]) {
  const persons = (r: GuestRow) => Math.max(0, Math.round(toNum(r.persons)));
  const by = (rsvp: string) => rows.filter((r) => r.rsvp === rsvp);
  return {
    entries: rows.length,
    invited: rows.filter((r) => r.invited).length,
    personsTotal: rows.reduce((a, r) => a + persons(r), 0),
    yes: by("Zusage").reduce((a, r) => a + persons(r), 0),
    no: by("Absage").reduce((a, r) => a + persons(r), 0),
    open: by("offen").reduce((a, r) => a + persons(r), 0),
    /** Zusagen + noch offen (ohne Absagen) – Basis für „Kosten pro Person“, solange Zusagen fehlen. */
    notDeclined: rows.filter((r) => r.rsvp !== "Absage").reduce((a, r) => a + persons(r), 0),
  };
}

/** Kosten pro anwesender Person (nur sinnvoll bei > 0 Personen). */
export function costPerPerson(expected: number, persons: number): number | null {
  return persons > 0 ? cents(expected / persons) : null;
}
