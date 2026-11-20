// Reine Anmelde-Logik ohne Next/Datenbank (Passwort-Hash, Token, E-Mail, Client-IP), damit sie einzeln testbar ist.
// Wird nur serverseitig genutzt (lib/auth.ts, lib/actions.ts).
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

export const SCRYPT_N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;
/** Erlaubte Kostenfaktoren beim Prüfen (verhindert, dass ein kaputter/fremder Hash den Server lahmlegt). */
const ALLOWED_N = new Set([16384, 32768, 65536]);
export const PASSWORD_MAX = 200;

/** Format: scrypt$<N>$<salt base64>$<hash base64> (identisch zu scripts/create-admin.mjs). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof password !== "string" || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [scheme, n, salt, hash] = parts;
  const N = Number(n);
  if (scheme !== "scrypt" || !ALLOWED_N.has(N) || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  if (expected.length < 32 || expected.length > 128) return false;
  try {
    const key = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N, r: R, p: P, maxmem: MAXMEM });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Zufälliges Sitzungs-Token (256 Bit). In der Datenbank liegt nur sha256(token). */
export const newSessionToken = () => randomBytes(32).toString("base64url");

/** Einheitliche Schreibweise für E-Mails (Login, Registrierung, Zählung der Fehlversuche, create-admin). */
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "").normalize("NFC").trim().toLowerCase();
}

/**
 * Client-IP aus X-Forwarded-For. Genommen wird der LETZTE Eintrag: den setzt der eigene Reverse-Proxy (Caddy)
 * bzw. Next selbst; frühere Einträge kann der Client frei erfinden (sonst ließe sich die Sperre pro IP umgehen).
 */
export function pickClientIp(forwardedFor: string | null, realIp: string | null): string {
  const list = (forwardedFor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return (list.at(-1) ?? realIp ?? "").trim().slice(0, 64);
}
