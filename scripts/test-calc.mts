// Tests für Berechnungen und Eingabe-Parser.
// Ausführen: node --experimental-strip-types --no-warnings scripts/test-calc.mts
import assert from "node:assert/strict";
import {
  budgetSummary,
  cents,
  costPerPerson,
  daysBetween,
  daysUntilWedding,
  effectiveAmount,
  guestSummary,
  sum,
  taskProgress,
  toNum,
  todayBerlin,
} from "../lib/calc.ts";
import { buildRowFromFields, buildSettingsRows, isValidDate, isValidTime, normalizeUrl, parseField, parseMoneyTotal, parseNumber } from "../lib/parse.ts";
import { SETTING_KEYS, TABLES } from "../lib/schema.ts";
import { eur, safeUrl } from "../lib/format.ts";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`✗ ${name}\n   ${(e as Error).message.split("\n").join("\n   ")}`);
  }
}

// ───────────── toNum / cents / sum ─────────────
test("toNum: numeric als String aus Postgres", () => {
  assert.equal(toNum("1250.50"), 1250.5);
  assert.equal(toNum(12), 12);
  assert.equal(toNum(null), 0);
  assert.equal(toNum(undefined), 0);
  assert.equal(toNum(""), 0);
  assert.equal(toNum("abc"), 0);
  assert.equal(toNum("Infinity"), 0);
  assert.equal(toNum(Number.NaN), 0);
});
test("cents: kaufmännisch runden, kein -0", () => {
  assert.equal(cents(1.005), 1.01);
  assert.equal(cents(2.675), 2.68);
  assert.equal(cents(-1.005), -1.01);
  assert.ok(Object.is(cents(-0.001), 0));
  assert.ok(Object.is(cents(-0), 0));
  assert.equal(cents(0.1 + 0.2), 0.3);
});
test("sum: Gleitkomma, Strings, null", () => {
  assert.equal(sum([0.1, 0.2]), 0.3);
  assert.equal(sum(["0.10", "0.20", null, "", undefined]), 0.3);
  assert.equal(sum(Array(10).fill("0.10")), 1);
  assert.equal(sum([]), 0);
  assert.equal(sum(["1234567.89", "0.11"]), 1234568);
  assert.equal(sum(Array(1000).fill(19.99)), 19990);
});

// ───────────── Budget ─────────────
test("effectiveAmount: actual sonst planned (0 ist ein echter Wert)", () => {
  assert.equal(effectiveAmount({ planned: "500", actual: null, paid: 0 }), 500);
  assert.equal(effectiveAmount({ planned: "500", actual: "", paid: 0 }), 500);
  assert.equal(effectiveAmount({ planned: "500", actual: "450.50", paid: 0 }), 450.5);
  assert.equal(effectiveAmount({ planned: "500", actual: "0", paid: 0 }), 0);
  assert.equal(effectiveAmount({ planned: null, actual: undefined, paid: null }), 0);
});
test("budgetSummary: geplant/erwartet/bezahlt/offen/verbleibend", () => {
  const rows = [
    { planned: "1000.00", actual: "1200.00", paid: "500.00" },
    { planned: "300.00", actual: null, paid: "0" },
    { planned: "0", actual: "99.99", paid: "99.99" },
  ];
  const b = budgetSummary(rows, "2000");
  assert.equal(b.total, 2000);
  assert.equal(b.planned, 1300);
  assert.equal(b.expected, 1599.99);
  assert.equal(b.paid, 599.99);
  assert.equal(b.openToPay, 1000);
  assert.equal(b.remaining, 400.01);
  assert.equal(b.overBudget, false);
  assert.equal(b.usedPercent, 80);
});
test("budgetSummary: Überschreitung und Prozent", () => {
  const b = budgetSummary([{ planned: "1500", actual: null, paid: 0 }], "1000");
  assert.equal(b.overBudget, true);
  assert.equal(b.remaining, -500);
  assert.equal(b.usedPercent, 150);
  const exact = budgetSummary([{ planned: "0.1", actual: null, paid: 0 }, { planned: "0.2", actual: null, paid: 0 }], "0.3");
  assert.equal(exact.overBudget, false);
  assert.ok(Object.is(exact.remaining, 0), "kein -0 (würde als „-0,00 €“ angezeigt)");
  assert.equal(budgetSummary([{ planned: "1000000", actual: null, paid: 0 }], "1").usedPercent, 999);
});
test("budgetSummary: ohne Gesamtbudget / leer / Budget als String mit Nachkomma", () => {
  const b = budgetSummary([{ planned: 100, actual: null, paid: 0 }], null);
  assert.equal(b.total, 0);
  assert.equal(b.overBudget, false);
  assert.equal(b.usedPercent, 0);
  assert.equal(b.remaining, -100);
  const e = budgetSummary([], "17000.5");
  assert.deepEqual([e.total, e.expected, e.paid, e.openToPay, e.remaining], [17000.5, 0, 0, 0, 17000.5]);
  assert.equal(budgetSummary([], "kaputt").total, 0);
});
test("budgetSummary: Überzahlung eines Postens verdeckt nicht offene Beträge anderer", () => {
  const b = budgetSummary(
    [
      { planned: 100, actual: null, paid: 150 },
      { planned: 200, actual: null, paid: 0 },
    ],
    1000,
  );
  assert.equal(b.openToPay, 200);
  assert.equal(b.paid, 150);
});

// ───────────── Aufgaben ─────────────
test("taskProgress", () => {
  assert.deepEqual(taskProgress([]), { total: 0, done: 0, open: 0, percent: 0 });
  assert.deepEqual(taskProgress([{ done: true }, { done: false }, { done: false }]), { total: 3, done: 1, open: 2, percent: 33 });
  const many = Array.from({ length: 200 }, (_, i) => ({ done: i > 0 }));
  assert.equal(taskProgress(many).percent, 99, "199/200 darf nicht 100 % zeigen");
  assert.equal(taskProgress([{ done: true }]).percent, 100);
});

// ───────────── Datum / Countdown ─────────────
test("daysBetween inkl. Schaltjahr und Jahreswechsel", () => {
  assert.equal(daysBetween("2026-11-20", "2026-11-20"), 0);
  assert.equal(daysBetween("2026-11-20", "2026-11-21"), 1);
  assert.equal(daysBetween("2026-11-21", "2026-11-20"), -1);
  assert.equal(daysBetween("2027-12-31", "2028-03-01"), 61); // 2028 ist Schaltjahr
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2); // über Zeitumstellung
  assert.equal(daysBetween("2026-10-24", "2026-10-26"), 2);
});
test("todayBerlin: Mitternacht, Sommer-/Winterzeit", () => {
  assert.equal(todayBerlin(new Date("2026-11-20T22:59:59Z")), "2026-11-20"); // 23:59 MEZ
  assert.equal(todayBerlin(new Date("2026-11-20T23:00:00Z")), "2026-11-21"); // 00:00 MEZ
  assert.equal(todayBerlin(new Date("2026-07-01T21:59:59Z")), "2026-07-01"); // 23:59 MESZ
  assert.equal(todayBerlin(new Date("2026-07-01T22:00:00Z")), "2026-07-02"); // 00:00 MESZ
  assert.equal(todayBerlin(new Date("2026-03-29T00:30:00Z")), "2026-03-29"); // Tag der Umstellung
  assert.equal(todayBerlin(new Date("2026-03-29T22:00:00Z")), "2026-03-30");
  assert.equal(todayBerlin(new Date("2026-10-25T22:59:00Z")), "2026-10-25");
  assert.equal(todayBerlin(new Date("2026-10-25T23:00:00Z")), "2026-10-26");
  assert.equal(todayBerlin(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});
test("daysUntilWedding", () => {
  assert.equal(daysUntilWedding("2027-06-12", new Date("2027-06-11T22:30:00Z")), 0); // schon 12.06. in Berlin
  assert.equal(daysUntilWedding("2027-06-12", new Date("2027-06-11T21:30:00Z")), 1);
  assert.equal(daysUntilWedding("2027-06-12", new Date("2027-06-13T08:00:00Z")), -1);
  assert.equal(daysUntilWedding("2027-04-01", new Date("2027-03-27T12:00:00Z")), 5); // über Umstellung 28.03.2027
  assert.equal(daysUntilWedding("", new Date()), null);
  assert.equal(daysUntilWedding(null), null);
  assert.equal(daysUntilWedding("12.06.2027"), null);
  assert.equal(daysUntilWedding("2027-02-30"), null);
  assert.equal(daysUntilWedding("2027-13-01"), null);
});

// ───────────── Gäste ─────────────
test("guestSummary: Summen nach Rückmeldung", () => {
  const g = guestSummary([
    { rsvp: "Zusage", persons: 2, invited: true },
    { rsvp: "Zusage", persons: "1", invited: true },
    { rsvp: "Absage", persons: 3, invited: true },
    { rsvp: "offen", persons: 4, invited: false },
    { rsvp: "offen", persons: null, invited: false },
    { rsvp: "offen", persons: -2 },
    { rsvp: "offen", persons: 1.6 },
  ]);
  assert.equal(g.entries, 7);
  assert.equal(g.invited, 3);
  assert.equal(g.yes, 3);
  assert.equal(g.no, 3);
  assert.equal(g.open, 6);
  assert.equal(g.personsTotal, 12);
  assert.equal(g.notDeclined, 9);
  assert.equal(g.yes + g.no + g.open, g.personsTotal);
});
test("costPerPerson", () => {
  assert.equal(costPerPerson(1000, 3), 333.33);
  assert.equal(costPerPerson(1000, 0), null);
  assert.equal(costPerPerson(0, 5), 0);
});

// ───────────── parseNumber ─────────────
test("parseNumber: deutsche Formate", () => {
  assert.equal(parseNumber("1.250,50"), 1250.5);
  assert.equal(parseNumber("1250,5"), 1250.5);
  assert.equal(parseNumber("1250,50"), 1250.5);
  assert.equal(parseNumber("1.250"), 1250);
  assert.equal(parseNumber("10.000"), 10000);
  assert.equal(parseNumber("1.250.000"), 1250000);
  assert.equal(parseNumber("17000"), 17000);
  assert.equal(parseNumber(",50"), 0.5);
  assert.equal(parseNumber("100,-"), 100);
  assert.equal(parseNumber(" 1 250,50 "), 1250.5);
  assert.equal(parseNumber("1 250,50"), 1250.5);
});
test("parseNumber: englische Formate", () => {
  assert.equal(parseNumber("1,250.50"), 1250.5);
  assert.equal(parseNumber("1,250,000"), 1250000);
  assert.equal(parseNumber("12.50"), 12.5);
  assert.equal(parseNumber("12.5"), 12.5);
  assert.equal(parseNumber("0.250"), 0.25);
});
test("parseNumber: Währungszeichen", () => {
  assert.equal(parseNumber("€ 100"), 100);
  assert.equal(parseNumber("100 €"), 100);
  assert.equal(parseNumber("100€"), 100);
  assert.equal(parseNumber("100 EUR"), 100);
  assert.equal(parseNumber("€1.250,50"), 1250.5);
});
test("parseNumber: leer, negativ, ungültig", () => {
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("   "), null);
  assert.equal(parseNumber("€"), null);
  assert.equal(parseNumber("-5"), -5);
  assert.equal(parseNumber("−5"), -5);
  assert.ok(Object.is(parseNumber("-0"), 0));
  for (const bad of ["abc", "1e5", "Infinity", "NaN", "1,2.5", "1.2.3", "1..5", "1,,5", "1.", "1,", ".", "--5", "0x10", "12a", "1.25,5.0"]) {
    assert.ok(Number.isNaN(parseNumber(bad)), `„${bad}“ muss ungültig sein, war ${parseNumber(bad)}`);
  }
});
test("parseNumber: riesige Werte bleiben Zahlen (Grenzprüfung in parseField)", () => {
  assert.equal(parseNumber("99999999999"), 99999999999);
  assert.equal(parseNumber("9".repeat(400)), Number.POSITIVE_INFINITY);
});

// ───────────── parseField ─────────────
const F = (table: keyof typeof TABLES, key: string) => {
  const f = (TABLES[table].fields as readonly { key: string }[]).find((x) => x.key === key);
  if (!f) throw new Error(`Feld ${table}.${key} fehlt`);
  return f as Parameters<typeof parseField>[0];
};
const val = (r: ReturnType<typeof parseField>) => {
  if ("error" in r) throw new Error("Unerwarteter Fehler: " + r.error);
  return r.value;
};
const err = (r: ReturnType<typeof parseField>) => {
  if (!("error" in r)) throw new Error("Fehler erwartet, bekam " + JSON.stringify(r.value));
  return r.error;
};

test("parseField money", () => {
  const planned = F("budget", "planned");
  const actual = F("budget", "actual");
  assert.equal(val(parseField(planned, "1.250,50")), 1250.5);
  assert.equal(val(parseField(planned, "1,250.50")), 1250.5);
  assert.equal(val(parseField(planned, "")), 0); // zero
  assert.equal(val(parseField(actual, "")), null); // nicht zero → NULL
  assert.equal(val(parseField(actual, "0")), 0);
  assert.equal(val(parseField(planned, "9999999")), 9999999);
  assert.equal(val(parseField(planned, "1,10")), 1.1);
  err(parseField(planned, "-5"));
  err(parseField(planned, "10000000"));
  err(parseField(planned, "9".repeat(400)));
  err(parseField(planned, "abc"));
  assert.match(err(parseField(planned, "1,255")), /Nachkommastellen/);
  assert.match(err(parseField(planned, "1,250")), /Nachkommastellen/); // mehrdeutig (en: 1250 / de: 1,25) → nachfragen
  assert.match(err(parseField(planned, "0.250")), /Nachkommastellen/);
  assert.equal(val(parseField(planned, "1.250")), 1250); // de: Tausenderpunkt
  assert.equal(val(parseField(planned, "1,250,000.75")), 1250000.75);
});
test("parseField integer", () => {
  const persons = F("guests", "persons");
  assert.equal(val(parseField(persons, "2")), 2);
  assert.equal(val(parseField(persons, "")), 0);
  assert.equal(val(parseField(persons, "3,0")), 3);
  err(parseField(persons, "1,5"));
  err(parseField(persons, "11"));
  err(parseField(persons, "-1"));
  const sort = F("faq", "sort_order");
  assert.equal(val(parseField(sort, "1.000")), 1000);
  err(parseField(sort, "10.000"));
  err(parseField(sort, "1,000")); // mehrdeutig → nicht stillschweigend 1
});
test("parseField date/time", () => {
  const d = F("budget", "due_date");
  assert.equal(val(parseField(d, "2027-06-12")), "2027-06-12");
  assert.equal(val(parseField(d, "2028-02-29")), "2028-02-29");
  err(parseField(d, "2027-02-29"));
  err(parseField(d, "2027-02-31"));
  err(parseField(d, "2027-13-01"));
  err(parseField(d, "12.06.2027"));
  const t = F("schedule", "time");
  assert.equal(val(parseField(t, "14:30")), "14:30");
  assert.equal(val(parseField(t, "14:30:00")), "14:30:00");
  assert.equal(val(parseField(t, "00:00")), "00:00");
  err(parseField(t, "25:00"));
  err(parseField(t, "12:60"));
  err(parseField(t, "9:30"));
  assert.ok(isValidDate("2026-11-20") && !isValidDate("2026-11-31"));
  assert.ok(isValidTime("23:59") && !isValidTime("24:00") && !isValidTime("12:00:00", false));
});
test("parseField url: http(s) erzwingen, javascript:/data: blocken", () => {
  const u = F("budget", "url");
  assert.equal(val(parseField(u, "www.example.de")), "https://www.example.de/");
  assert.equal(val(parseField(u, "http://example.de/a?b=1")), "http://example.de/a?b=1");
  assert.equal(val(parseField(u, "HTTPS://Example.de")), "https://example.de/");
  assert.equal(val(parseField(u, "example.de:8080/x")), "https://example.de:8080/x");
  for (const bad of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "javascript://%0aalert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "mailto:a@b.de",
    "ftp://example.de",
    "https://user:pw@example.de",
    "https://example.de@evil.example",
    "http://",
    "exa mple.de",
  ]) {
    err(parseField(u, bad));
    assert.equal(normalizeUrl(bad), null, bad);
  }
});
test("parseField select/bool/required/Länge", () => {
  const status = F("budget", "status");
  assert.equal(val(parseField(status, "Gebucht")), "Gebucht");
  err(parseField(status, "Hacked"));
  err(parseField(status, ""));
  const rating = F("vendors", "rating");
  assert.equal(val(parseField(rating, "")), null);
  const done = F("tasks", "done");
  assert.equal(val(parseField(done, true)), true);
  assert.equal(val(parseField(done, "on")), true);
  assert.equal(val(parseField(done, "false")), false);
  assert.equal(val(parseField(done, undefined)), false);
  err(parseField(F("budget", "title"), "   "));
  err(parseField(F("budget", "notes"), "x".repeat(5001)));
});
test("buildRowFromFields: nur Whitelist-Spalten", () => {
  const r = buildRowFromFields(TABLES.gifts.fields, { title: "Toaster", price: "49,90", reserved_by: "x", id: "y", evil: "1" } as never);
  assert.ok("row" in r);
  if ("row" in r) {
    assert.deepEqual(Object.keys(r.row).sort(), ["description", "price", "title", "url"]);
    assert.equal(r.row.price, 49.9);
  }
  assert.ok("error" in buildRowFromFields(TABLES.budget.fields, {}));
});
test("parseMoneyTotal", () => {
  assert.equal(parseMoneyTotal("17.000"), 17000);
  assert.equal(parseMoneyTotal("17000,5"), 17000.5);
  assert.equal(parseMoneyTotal("17000.5"), 17000.5); // Anzeige von BudgetTotalForm nach String()
  assert.equal(parseMoneyTotal("0"), 0);
  assert.equal(parseMoneyTotal(""), null);
  assert.equal(parseMoneyTotal("-1"), null);
  assert.equal(parseMoneyTotal("10000000"), null);
  assert.equal(parseMoneyTotal("1,255"), null);
});
test("buildSettingsRows: nur bekannte/übergebene Schlüssel, Validierung", () => {
  const ok = buildSettingsRows(SETTING_KEYS, { welcome_text: " Hallo ", map_url: "maps.example.de", wedding_date: "2027-06-12", wedding_time: "14:00", foo: "x", __proto__: { bride_name: "x" } } as never);
  assert.ok("rows" in ok);
  if ("rows" in ok) {
    assert.deepEqual(
      ok.rows.map((r) => r.key).sort(),
      ["map_url", "wedding_date", "wedding_time", "welcome_text"],
    );
    assert.equal(ok.rows.find((r) => r.key === "map_url")?.value, "https://maps.example.de/");
    assert.equal(ok.rows.find((r) => r.key === "welcome_text")?.value, "Hallo");
  }
  assert.ok("rows" in buildSettingsRows(SETTING_KEYS, { venue_url: "" }));
  assert.ok("error" in buildSettingsRows(SETTING_KEYS, { photos_url: "javascript:alert(1)" }));
  assert.ok("error" in buildSettingsRows(SETTING_KEYS, { wedding_date: "2027-02-30" }));
  assert.ok("error" in buildSettingsRows(SETTING_KEYS, { wedding_time: "25:00" }));
  assert.ok("error" in buildSettingsRows(SETTING_KEYS, { dresscode: "x".repeat(5001) }));
});

// ───────────── Anzeige ─────────────
test("safeUrl / eur", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,x"), null);
  assert.equal(safeUrl("https://a.de"), "https://a.de/");
  assert.equal(safeUrl(""), null);
  assert.equal(safeUrl("kein link"), null);
  assert.equal(eur(1250.5).replace(/\s/g, " "), "1.250,50 €");
  assert.equal(eur(null), "–");
  assert.equal(eur(Number("1250.50")).replace(/\s/g, " "), "1.250,50 €");
});
test("CrudManager-Summen: Strings aus DB, leere Werte", () => {
  const rows = [{ price: "19.99" }, { price: null }, { price: "0.01" }, { price: 80 }];
  assert.equal(sum(rows.map((r) => r.price as number | null)), 100);
});

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${passed} bestanden, ${failures.length} fehlgeschlagen`);
  process.exit(1);
}
console.log(`Alle ${passed} Tests bestanden.`);
