import Nav from "@/components/Nav";
import { getSettings, requireApproved } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireApproved();
  const s = await getSettings();
  const names = [s.bride_name, s.groom_name].filter(Boolean).join(" & ") || "Unsere Hochzeit";
  return (
    <>
      <a className="skip-link" href="#inhalt">
        Zum Inhalt springen
      </a>
      <Nav names={names} isPlanner={profile.role === "admin" || profile.role === "planer"} userName={profile.full_name || profile.email} />
      <main id="inhalt" className="container">{children}</main>
      <footer className="site-footer muted small">Privater Bereich · {names}</footer>
    </>
  );
}
