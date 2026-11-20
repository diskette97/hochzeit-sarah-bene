"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ident, query, tx } from "@/lib/db";
import { createSession, destroySession, dummyHash, hashPassword, PASSWORD_MAX, verifyPassword } from "@/lib/auth";
import { normalizeEmail, pickClientIp } from "@/lib/password";
import { getSession } from "@/lib/session";
import { PLAN_SETTING_KEYS, ROLES, SETTING_KEYS, STATUSES, TABLES, type Field, type TableKey } from "@/lib/schema";
import { buildRowFromFields, buildSettingsRows, parseMoneyTotal } from "@/lib/parse";

export type ActionState = { error?: string; ok?: string } | undefined;
type Values = Record<string, string | boolean | null | undefined>;

const refresh = () => revalidatePath("/", "layout");

async function assertPlanner() {
  const { user, profile } = await getSession();
  if (!user || !profile || profile.status !== "approved" || (profile.role !== "admin" && profile.role !== "planer")) {
    throw new Error("Keine Berechtigung.");
  }
  return { user, profile };
}

async function assertAdmin() {
  const s = await assertPlanner();
  if (s.profile.role !== "admin") throw new Error("Nur Admins dürfen das.");
  return s;
}

// Eigene Meldungen (throw new Error("…")) gehen an die Oberfläche; Datenbank-/Systemfehler (mit `code`) nicht,
// damit keine internen Details (Tabellen, Constraints, Verbindungsdaten) beim Client landen.
const fail = (e: unknown): ActionState => {
  if (e instanceof Error && !("code" in e)) return { error: e.message };
  console.error("Server Action:", e);
  return { error: "Das hat nicht geklappt. Bitte versuche es noch einmal." };
};

// ───────────── Eingaben prüfen und in DB-Werte umwandeln (reine Logik in lib/parse.ts) ─────────────

/** Nur eigene Schlüssel von TABLES (kein "__proto__", "constructor" …). */
function tableConfig(tableKey: string) {
  return typeof tableKey === "string" && Object.hasOwn(TABLES, tableKey) ? TABLES[tableKey as TableKey] : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

function buildRow(tableKey: string, values: Values): { row: Record<string, unknown> } | { error: string } {
  const cfg = tableConfig(tableKey);
  if (!cfg) return { error: "Unbekannte Tabelle." };
  return buildRowFromFields(cfg.fields as readonly Field[], values ?? {});
}

// ───────────── Anmeldung / Registrierung ─────────────

async function clientIp(): Promise<string> {
  const h = await headers();
  return pickClientIp(h.get("x-forwarded-for"), h.get("x-real-ip"));
}

// Pro E-Mail + IP greift die Sperre schnell; pro E-Mail insgesamt erst später, damit ein Fremder mit wenigen
// Fehlversuchen nicht das Konto des Brautpaars sperren kann (Lockout-DoS), verteiltes Raten aber trotzdem gebremst wird.
const MAX_FAILS_PER_EMAIL_IP = 8;
const MAX_FAILS_PER_EMAIL = 30;
const MAX_FAILS_PER_IP = 40;
const MAX_REGISTRATIONS_PER_IP = 10;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(formData instanceof FormData)) return { error: "Ungültige Anfrage." };
  const email = normalizeEmail(formData.get("email")).slice(0, 254);
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Bitte E-Mail und Passwort eingeben." };
  if (password.length > PASSWORD_MAX) return { error: "E-Mail oder Passwort stimmt nicht." };
  const ip = await clientIp();

  const { rows: fails } = await query<{ by_email_ip: number; by_email: number; by_ip: number }>(
    `select count(*) filter (where lower(email) = $1 and ip = $2) as by_email_ip,
            count(*) filter (where lower(email) = $1) as by_email,
            count(*) filter (where ip = $2 and $2 <> '') as by_ip
       from login_attempts where kind = 'login' and created_at > now() - interval '15 minutes'`,
    [email, ip],
  );
  const f = fails[0];
  if (f.by_email_ip >= MAX_FAILS_PER_EMAIL_IP || f.by_email >= MAX_FAILS_PER_EMAIL || f.by_ip >= MAX_FAILS_PER_IP) {
    return { error: "Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es dann erneut." };
  }

  const { rows } = await query<{ id: string; password_hash: string }>("select id, password_hash from users where lower(email) = $1", [email]);
  const user = rows[0];
  const ok = await verifyPassword(password, user ? user.password_hash : await dummyHash());
  if (!user || !ok) {
    await query("insert into login_attempts (kind, email, ip) values ('login', $1, $2)", [email, ip]);
    return { error: "E-Mail oder Passwort stimmt nicht." };
  }
  await query("delete from login_attempts where kind = 'login' and lower(email) = $1", [email]);
  await createSession(user.id);
  redirect("/");
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(formData instanceof FormData)) return { error: "Ungültige Anfrage." };
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { error: "Bitte gib deinen Namen an, damit wir dich freischalten können." };
  if (name.length > 120) return { error: "Der Name ist zu lang." };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  if (password.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
  if (password.length > PASSWORD_MAX) return { error: "Das Passwort ist zu lang." };

  const ip = await clientIp();
  const { rows: recent } = await query<{ n: number }>(
    "select count(*) as n from login_attempts where kind = 'register' and ip = $1 and ip <> '' and created_at > now() - interval '1 hour'",
    [ip],
  );
  if (recent[0].n >= MAX_REGISTRATIONS_PER_IP) return { error: "Zu viele Registrierungen von dieser Adresse. Bitte versuche es später erneut." };
  // Jeder Versuch zählt (auch mit schon vergebener E-Mail) und wird VOR dem teuren Hash gezählt:
  // begrenzt E-Mail-Abfragen über die Registrierung und CPU-Last durch scrypt.
  await query("insert into login_attempts (kind, email, ip) values ('register', $1, $2)", [email, ip]);

  const hash = await hashPassword(password);
  try {
    // Jeder neue Account startet als Gast und wartet auf Freischaltung. Admins legt nur scripts/create-admin.mjs an.
    await query("insert into users (email, full_name, password_hash, role, status) values ($1, $2, $3, 'gast', 'pending')", [email, name, hash]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { error: "Mit dieser E-Mail gibt es schon ein Konto. Bitte melde dich an." };
    throw e;
  }
  return { ok: "Danke! Dein Zugang ist angefragt. Sobald Sarah oder Bene dich freigeschaltet haben, kannst du dich anmelden und siehst alle Inhalte." };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ───────────── Daten bearbeiten (nur Planer/Admin) ─────────────

export async function saveRow(tableKey: string, id: string | null, values: Values): Promise<ActionState> {
  try {
    await assertPlanner();
    const built = buildRow(tableKey, values);
    if ("error" in built) return { error: built.error };
    const cfg = tableConfig(tableKey)!;
    if (id !== null && !isUuid(id)) return { error: "Ungültiger Eintrag." };
    const cols = Object.keys(built.row);
    const vals = cols.map((c) => built.row[c]);
    let res;
    if (id) {
      const sets = cols.map((c, i) => `${ident(c)} = $${i + 1}`).join(", ");
      res = await query(`update ${ident(cfg.table)} set ${sets}, updated_at = now() where id = $${cols.length + 1} returning id`, [...vals, id]);
    } else {
      const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
      res = await query(`insert into ${ident(cfg.table)} (${cols.map(ident).join(", ")}) values (${ph}) returning id`, vals);
    }
    if (res.rowCount === 0) return { error: "Speichern fehlgeschlagen: Eintrag nicht gefunden (evtl. inzwischen gelöscht)." };
    refresh();
    return { ok: "Gespeichert." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRow(tableKey: string, id: string): Promise<ActionState> {
  try {
    await assertPlanner();
    const cfg = tableConfig(tableKey);
    if (!cfg) return { error: "Unbekannte Tabelle." };
    if (!isUuid(id)) return { error: "Ungültiger Eintrag." };
    await query(`delete from ${ident(cfg.table)} where id = $1`, [id]);
    refresh();
    return { ok: "Gelöscht." };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleBool(tableKey: string, id: string, key: string, value: boolean): Promise<ActionState> {
  try {
    await assertPlanner();
    const cfg = tableConfig(tableKey);
    const field = (cfg?.fields as readonly Field[] | undefined)?.find((f) => f.key === key);
    if (!cfg || !field || field.type !== "bool" || !isUuid(id)) return { error: "Ungültiges Feld." };
    // Setzt den absoluten Wert (kein Umschalten auf dem Server) → doppelte Klicks sind harmlos.
    const res = await query(`update ${ident(cfg.table)} set ${ident(key)} = $1, updated_at = now() where id = $2 returning id`, [value === true, id]);
    if (res.rowCount === 0) return { error: "Eintrag nicht gefunden." };
    refresh();
    return { ok: "ok" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSettings(values: Record<string, string>): Promise<ActionState> {
  try {
    await assertPlanner();
    const built = buildSettingsRows(SETTING_KEYS, values);
    if ("error" in built) return { error: built.error };
    // Nur geänderte Felder werden geschickt (siehe SettingsForm) → keine Überschreibung paralleler Änderungen.
    if (built.rows.length === 0) return { ok: "Keine Änderungen." };
    await tx(async (c) => {
      for (const r of built.rows) {
        await c.query(
          "insert into site_settings (key, value, updated_at) values ($1, $2, now()) on conflict (key) do update set value = excluded.value, updated_at = now()",
          [r.key, r.value],
        );
      }
    });
    refresh();
    return { ok: "Gespeichert." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveBudgetTotal(raw: string): Promise<ActionState> {
  try {
    await assertPlanner();
    const n = parseMoneyTotal(String(raw ?? ""));
    if (n === null) return { error: "Bitte einen gültigen Betrag eingeben (z. B. 17.000 oder 17000,50)." };
    await query(
      "insert into plan_settings (key, value, updated_at) values ($1, $2, now()) on conflict (key) do update set value = excluded.value, updated_at = now()",
      [PLAN_SETTING_KEYS[0], String(n)],
    );
    refresh();
    return { ok: "Gespeichert." };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Gäste: Zusage & Wunschliste ─────────────

export async function submitRsvp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await getSession();
  if (!user || !profile || profile.status !== "approved") return { error: "Nicht freigeschaltet." };
  if (!(formData instanceof FormData)) return { error: "Ungültige Anfrage." };

  const name = String(formData.get("name") ?? "").trim();
  const attending = String(formData.get("attending") ?? "");
  const persons = Number(formData.get("persons") ?? 1);
  if (name.length < 2) return { error: "Bitte gib deinen Namen an." };
  if (name.length > 200) return { error: "Der Name ist zu lang." };
  if (!["zusage", "absage", "offen"].includes(attending)) return { error: "Bitte Zusage oder Absage wählen." };
  if (!Number.isInteger(persons) || persons < 0 || persons > 10) return { error: "Bitte eine Personenzahl zwischen 0 und 10 angeben." };
  const clip = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length > 1000 ? v.slice(0, 1000) : v || null;
  };

  await query(
    `insert into rsvps (user_id, name, attending, persons, companions, diet, song_wish, message, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (user_id) do update set name = excluded.name, attending = excluded.attending, persons = excluded.persons,
       companions = excluded.companions, diet = excluded.diet, song_wish = excluded.song_wish, message = excluded.message, updated_at = now()`,
    [user.id, name, attending, attending === "absage" ? 0 : Math.max(persons, 1), clip("companions"), clip("diet"), clip("song_wish"), clip("message")],
  );
  refresh();
  return { ok: attending === "absage" ? "Danke für deine Rückmeldung – schade, dass du nicht dabei sein kannst." : "Danke! Deine Rückmeldung ist gespeichert. Du kannst sie jederzeit ändern." };
}

export async function reserveGift(id: string, reserve: boolean): Promise<ActionState> {
  const { user, profile } = await getSession();
  if (!user || !profile || profile.status !== "approved") return { error: "Nicht freigeschaltet." };
  if (!isUuid(id)) return { error: "Das hat nicht geklappt." };
  const planner = profile.role === "admin" || profile.role === "planer";
  try {
    await tx(async (c) => {
      const { rows } = await c.query<{ reserved_by: string | null }>("select reserved_by from gifts where id = $1 for update", [id]);
      if (!rows[0]) throw new Error("Das hat nicht geklappt.");
      const holder = rows[0].reserved_by;
      if (reserve === true) {
        if (holder && holder !== user.id) throw new Error("Das wurde gerade schon von jemand anderem reserviert.");
        await c.query("update gifts set reserved_by = $2, updated_at = now() where id = $1", [id, user.id]);
      } else {
        if (holder === null) return; // schon frei (z. B. Doppelklick) → kein Fehler
        if (holder !== user.id && !planner) throw new Error("Das hat nicht geklappt.");
        await c.query("update gifts set reserved_by = null, updated_at = now() where id = $1", [id]);
      }
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: "ok" };
}

// ───────────── Benutzerverwaltung (nur Admin) ─────────────

export async function updateUser(id: string, role: string, status: string): Promise<ActionState> {
  try {
    const { user } = await assertAdmin();
    if (!(ROLES as readonly string[]).includes(role) || !(STATUSES as readonly string[]).includes(status)) {
      return { error: "Ungültige Angabe." };
    }
    if (!isUuid(id)) return { error: "Ungültige Angabe." };
    if (id === user.id && (role !== "admin" || status !== "approved")) {
      return { error: "Du kannst dir selbst den Admin-Zugang nicht entziehen." };
    }
    await tx(async (c) => {
      // Sperre, damit zwei Admins sich nicht gleichzeitig gegenseitig herabstufen können.
      await c.query("select pg_advisory_xact_lock(424243)");
      // Unter der Sperre erneut prüfen: Wurde ich gerade selbst herabgestuft/gesperrt, darf ich nichts mehr ändern.
      const me = await c.query("select 1 from users where id = $1 and role = 'admin' and status = 'approved'", [user.id]);
      if (me.rowCount === 0) throw new Error("Nur Admins dürfen das.");
      const r = await c.query("update users set role = $2, status = $3 where id = $1 returning id", [id, role, status]);
      if (r.rowCount === 0) throw new Error("Benutzer nicht gefunden.");
      const a = await c.query("select 1 from users where role = 'admin' and status = 'approved' limit 1");
      if (a.rowCount === 0) throw new Error("Es muss mindestens ein freigeschalteter Admin bleiben.");
      if (status !== "approved") await c.query("delete from sessions where user_id = $1", [id]);
    });
    refresh();
    return { ok: "Gespeichert." };
  } catch (e) {
    return fail(e);
  }
}

/** Ersatz für „Passwort vergessen“: Der Admin vergibt ein neues Passwort; alle Sitzungen der Person werden beendet. */
export async function setUserPassword(id: string, password: string): Promise<ActionState> {
  try {
    await assertAdmin();
    if (!isUuid(id)) return { error: "Ungültige Angabe." };
    if (typeof password !== "string" || password.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
    if (password.length > PASSWORD_MAX) return { error: "Das Passwort ist zu lang." };
    const hash = await hashPassword(password);
    const r = await query("update users set password_hash = $2 where id = $1 returning id", [id, hash]);
    if (r.rowCount === 0) return { error: "Benutzer nicht gefunden." };
    await query("delete from sessions where user_id = $1", [id]);
    return { ok: "Neues Passwort gesetzt." };
  } catch (e) {
    return fail(e);
  }
}
