import NavLink from "@/components/NavLink";
import { requirePlanner } from "@/lib/session";

const LINKS = [
  { href: "/plan", label: "Übersicht" },
  { href: "/plan/termine", label: "Termine" },
  { href: "/plan/budget", label: "Budget" },
  { href: "/plan/aufgaben", label: "Aufgaben" },
  { href: "/plan/dienstleister", label: "Dienstleister" },
  { href: "/plan/gaeste", label: "Gästeliste" },
  { href: "/plan/zusagen", label: "Zusagen" },
  { href: "/plan/ideen", label: "Ideen" },
  { href: "/plan/inhalte", label: "Gästeseite bearbeiten" },
];

export default async function PlanLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePlanner();
  return (
    <>
      <nav className="subnav" aria-label="Planung">
        {LINKS.map((l) => (
          <NavLink key={l.href} href={l.href} exact={l.href === "/plan"}>
            {l.label}
          </NavLink>
        ))}
        {profile.role === "admin" && <NavLink href="/plan/benutzer">Benutzer</NavLink>}
      </nav>
      {children}
    </>
  );
}
