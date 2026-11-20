import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { userFromCookie, type SessionUser } from "@/lib/auth";

export type Profile = SessionUser;

export const getSession = cache(async () => {
  const profile = await userFromCookie();
  return { user: profile ? { id: profile.id, email: profile.email } : null, profile };
});

export async function requireApproved() {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/login");
  if (profile.status !== "approved") redirect("/wartet");
  return { user, profile };
}

export async function requirePlanner() {
  const s = await requireApproved();
  if (s.profile.role !== "admin" && s.profile.role !== "planer") redirect("/");
  return s;
}

export async function requireAdmin() {
  const s = await requireApproved();
  if (s.profile.role !== "admin") redirect("/plan");
  return s;
}

export async function getSettings(): Promise<Record<string, string>> {
  const { rows } = await query<{ key: string; value: string }>("select key, value from site_settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
