import "server-only";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { COOKIE_NAME, SITE_URL } from "@/lib/env";
import { hashPassword, newSessionToken, sha256 } from "@/lib/password";

export { hashPassword, verifyPassword, PASSWORD_MAX } from "@/lib/password";
export const SESSION_DAYS = 30;

// Fester Dummy-Hash, damit ein Login mit unbekannter E-Mail gleich lange dauert wie mit bekannter.
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hashPassword("dummy-password-for-timing");
  return dummy;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  // Eine evtl. vorhandene alte Sitzung dieses Browsers beenden (kein Weiterleben alter Tokens nach neuem Login).
  const old = store.get(COOKIE_NAME)?.value;
  if (old && old.length <= 200) await query("delete from sessions where token_hash = $1", [sha256(old)]);
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [sha256(token), userId, expires]);
  // Abgelaufene Sitzungen und alte Fehlversuche nebenbei aufräumen.
  await query("delete from sessions where expires_at < now()");
  await query("delete from login_attempts where created_at < now() - interval '2 days'");
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SITE_URL.startsWith("https://"),
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [sha256(token)]);
  store.delete(COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "planer" | "gast";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function userFromCookie(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || token.length > 200) return null;
  const { rows } = await query<SessionUser>(
    `select u.id, u.email, u.full_name, u.role, u.status, u.created_at
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}
