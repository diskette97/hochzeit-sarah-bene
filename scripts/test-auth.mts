// Tests für Anmelde-Logik (Passwort-Hash, Token, E-Mail, Client-IP) und statische Zugriffs-Checks.
// Ausführen: node --experimental-strip-types --no-warnings scripts/test-auth.mts
import assert from "node:assert/strict";
import { randomBytes, scrypt } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { hashPassword, newSessionToken, normalizeEmail, PASSWORD_MAX, pickClientIp, sha256, verifyPassword } from "../lib/password.ts";
import { TABLES } from "../lib/schema.ts";

let passed = 0;
const failures: string[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
  } catch (e) {
    failures.push(`✗ ${name}\n   ${(e as Error).message.split("\n").join("\n   ")}`);
  }
}

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

// ───────────── Passwort-Hash ─────────────
await test("hashPassword: Format scrypt$16384$salt$hash, 16 Byte Salt, 64 Byte Hash, Salt zufällig", async () => {
  const a = await hashPassword("geheim-123");
  const b = await hashPassword("geheim-123");
  const [scheme, n, salt, hash] = a.split("$");
  assert.equal(scheme, "scrypt");
  assert.equal(n, "16384");
  assert.equal(Buffer.from(salt, "base64").length, 16);
  assert.equal(Buffer.from(hash, "base64").length, 64);
  assert.notEqual(a, b, "gleiches Passwort → unterschiedlicher Hash");
});

await test("verifyPassword: richtig/falsch, Groß-/Kleinschreibung, Unicode, Maximallänge", async () => {
  const h = await hashPassword("Geheim-123");
  assert.equal(await verifyPassword("Geheim-123", h), true);
  assert.equal(await verifyPassword("geheim-123", h), false);
  assert.equal(await verifyPassword("Geheim-123 ", h), false);
  assert.equal(await verifyPassword("", h), false);
  const u = await hashPassword("Grüße-ßäö-🎉");
  assert.equal(await verifyPassword("Grüße-ßäö-🎉", u), true);
  const long = "x".repeat(PASSWORD_MAX);
  assert.equal(await verifyPassword(long, await hashPassword(long)), true);
});

await test("verifyPassword: kaputte/fremde Hashes → false statt Absturz", async () => {
  const h = await hashPassword("abcdefgh");
  const [, , salt, hash] = h.split("$");
  for (const bad of ["", "abc", "scrypt$", `bcrypt$16384$${salt}$${hash}`, `scrypt$16384$${salt}`, `scrypt$16384$$${hash}`,
    `scrypt$1048576$${salt}$${hash}`, // zu teuer → abgelehnt, kein Speicher-DoS
    `scrypt$1000$${salt}$${hash}`, // kein gültiges N
    `scrypt$16384$${salt}$${hash}$extra`, `scrypt$16384$${salt}$AAAA`]) {
    assert.equal(await verifyPassword("abcdefgh", bad), false, bad.slice(0, 30));
  }
  // @ts-expect-error absichtlich falscher Typ
  assert.equal(await verifyPassword(undefined, h), false);
});

await test("Hash aus scripts/create-admin.mjs ist mit verifyPassword kompatibel", async () => {
  const src = read("scripts/create-admin.mjs");
  assert.match(src, /N: 16384, r: 8, p: 1/);
  assert.match(src, /`scrypt\$16384\$\$\{salt\.toString\("base64"\)\}\$\$\{key\.toString\("base64"\)\}`/);
  const salt = randomBytes(16);
  const key = (await promisify(scrypt)("Admin-Pass-1", salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })) as Buffer;
  const stored = `scrypt$16384$${salt.toString("base64")}$${key.toString("base64")}`;
  assert.equal(await verifyPassword("Admin-Pass-1", stored), true);
  assert.equal(await verifyPassword("Admin-Pass-2", stored), false);
});

await test("Timing-Struktur: Login prüft bei unbekannter E-Mail gegen Dummy-Hash, Vergleich timing-safe", async () => {
  const actions = read("lib/actions.ts");
  assert.match(actions, /verifyPassword\(password, user \? user\.password_hash : await dummyHash\(\)\)/);
  const pw = read("lib/password.ts");
  assert.match(pw, /timingSafeEqual\(key, expected\)/);
  assert.doesNotMatch(pw, /key\.equals\(|toString\([^)]*\) === /);
});

// ───────────── Token / E-Mail / IP ─────────────
await test("Sitzungs-Token: 256 Bit base64url, eindeutig; in der DB nur sha256", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const t = newSessionToken();
    assert.match(t, /^[A-Za-z0-9_-]{43}$/);
    seen.add(t);
  }
  assert.equal(seen.size, 200);
  assert.match(sha256("x"), /^[0-9a-f]{64}$/);
  const auth = read("lib/auth.ts");
  assert.match(auth, /insert into sessions \(token_hash, user_id, expires_at\) values \(\$1, \$2, \$3\)", \[sha256\(token\)/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /sameSite: "lax"/);
  assert.match(auth, /secure: SITE_URL\.startsWith\("https:\/\/"\)/);
});

await test("normalizeEmail: trim, klein, Unicode NFC (keine Doppelkonten / Umgehung der Fehlversuch-Zählung)", () => {
  assert.equal(normalizeEmail("  Bene@Example.DE "), "bene@example.de");
  assert.equal(normalizeEmail("jürgen@x.de"), normalizeEmail("Jürgen@x.de"));
  assert.equal(normalizeEmail(null), "");
  assert.equal(normalizeEmail(undefined), "");
});

await test("pickClientIp: letzter X-Forwarded-For-Eintrag (vom eigenen Proxy), nicht der vom Client erfundene erste", () => {
  assert.equal(pickClientIp("1.2.3.4", null), "1.2.3.4");
  assert.equal(pickClientIp("6.6.6.6, 1.2.3.4", null), "1.2.3.4");
  assert.equal(pickClientIp(" 6.6.6.6 ,  ::1 ", null), "::1");
  assert.equal(pickClientIp(null, "5.5.5.5"), "5.5.5.5");
  assert.equal(pickClientIp("", null), "");
  assert.equal(pickClientIp("a".repeat(500), null).length, 64);
});

// ───────────── Statische Zugriffs-Checks ─────────────
function pages(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(root, p)).isDirectory() ? pages(p) : f === "page.tsx" ? [p] : [];
  });
}

await test("Jede Seite unter app/(app) prüft selbst Sitzung/Status/Rolle (Layout allein reicht nicht)", () => {
  const list = pages("app/(app)");
  assert.ok(list.length >= 15, `nur ${list.length} Seiten gefunden`);
  for (const p of list) {
    const src = read(p);
    const need = p.includes("/plan/benutzer/") ? /await requireAdmin\(\)/ : p.includes("/plan/") || p.endsWith("plan/page.tsx") ? /await requirePlanner\(\)/ : /await require(Approved|Planner|Admin)\(\)/;
    assert.match(src, need, p);
  }
});

await test("Jede Server Action außer login/register/logout prüft selbst Sitzung + Status (+ Rolle)", () => {
  const src = read("lib/actions.ts");
  assert.match(src, /^"use server";/);
  const re = /export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g;
  const found: string[] = [];
  for (const m of src.matchAll(re)) {
    const [, name, body] = m;
    found.push(name);
    if (["login", "register", "logout"].includes(name)) continue;
    const head = body.split("\n").slice(0, 4).join("\n");
    const ok = /await assert(Planner|Admin)\(\)/.test(head) || (/await getSession\(\)/.test(head) && /profile\.status !== "approved"/.test(head));
    assert.ok(ok, `${name}: keine Berechtigungsprüfung am Anfang`);
  }
  for (const n of ["saveRow", "deleteRow", "toggleBool", "saveSettings", "saveBudgetTotal", "submitRsvp", "reserveGift", "updateUser", "setUserPassword"]) {
    assert.ok(found.includes(n), `${n} nicht gefunden`);
  }
  for (const n of ["updateUser", "setUserPassword"]) {
    assert.match(src, new RegExp(`function ${n}[\\s\\S]*?await assertAdmin\\(\\)`), n);
  }
});

await test("Mass-Assignment: keine Systemspalten in TABLES (reserved_by, id, user_id, created_at …)", () => {
  const forbidden = ["id", "reserved_by", "user_id", "created_at", "updated_at", "password_hash", "role", "status_user"];
  for (const [k, cfg] of Object.entries(TABLES)) {
    for (const f of cfg.fields) {
      assert.ok(!forbidden.includes(f.key), `${k}.${f.key}`);
      assert.match(f.key, /^[a-z_][a-z0-9_]*$/, `${k}.${f.key}`);
    }
    assert.match(cfg.table, /^[a-z_][a-z0-9_]*$/);
    assert.notEqual(cfg.table, "users");
    assert.notEqual(cfg.table, "sessions");
  }
});

await test("Wunschliste: Gäste bekommen nie die Reservierer-ID/-Namen anderer", () => {
  const src = read("app/(app)/wunschliste/page.tsx");
  assert.match(src, /when g\.reserved_by = \$1 then g\.reserved_by::text\s+else 'other' end as reserved_by/);
  assert.match(src, /case when \$2::boolean then u\.full_name else null end as reserved_name/);
  assert.match(src, /const planner = profile\.role !== "gast"/);
});

await test("Migration: keine Supabase-Reste, Registrierung nie als Admin", () => {
  const sql = read("db/migrations/0001_init.sql");
  assert.doesNotMatch(sql, /auth\.uid|row level security|create policy|auth\.users|public\.profiles/i);
  assert.match(sql, /create unique index users_email_lower_idx on public\.users \(lower\(email\)\)/);
  const actions = read("lib/actions.ts");
  assert.match(actions, /insert into users \(email, full_name, password_hash, role, status\) values \(\$1, \$2, \$3, 'gast', 'pending'\)/);
});

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} von ${passed + failures.length} Auth-Tests fehlgeschlagen.`);
  process.exit(1);
}
console.log(`Alle ${passed} Auth-Tests bestanden.`);
