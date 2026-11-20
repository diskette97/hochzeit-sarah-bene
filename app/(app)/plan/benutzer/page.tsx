import UserAdmin from "@/components/UserAdmin";
import { query } from "@/lib/db";
import { requireAdmin, type Profile } from "@/lib/session";

export default async function UsersPage() {
  const { user } = await requireAdmin();
  const { rows } = await query<Profile>("select id, email, full_name, role, status, created_at from users order by created_at desc");
  const profiles = rows;
  const order = { pending: 0, approved: 1, rejected: 2 } as const;
  profiles.sort((a, b) => order[a.status] - order[b.status]);
  return (
    <>
      <h1>Benutzer &amp; Freischaltung</h1>
      <p className="muted">
        Neue Registrierungen warten hier. Rollen: <strong>Admin</strong> sieht und ändert alles inkl. Benutzer, <strong>Planer</strong> bearbeitet die Planung und Gästeseite, <strong>Gast</strong> sieht nur die Gästeseite.
      </p>
      <UserAdmin profiles={profiles} meId={user.id} />
    </>
  );
}
