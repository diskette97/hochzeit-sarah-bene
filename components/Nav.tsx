import Link from "next/link";
import { logout } from "@/lib/actions";
import NavLink from "@/components/NavLink";

const GUEST_LINKS = [
  { href: "/", label: "Start" },
  { href: "/ablauf", label: "Ablauf" },
  { href: "/anfahrt", label: "Anfahrt & Unterkunft" },
  { href: "/infos", label: "Infos & FAQ" },
  { href: "/zusage", label: "Zusage" },
  { href: "/wunschliste", label: "Wunschliste" },
];

export default function Nav({ names, isPlanner, userName }: { names: string; isPlanner: boolean; userName: string }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        {names}
      </Link>
      <nav className="nav" aria-label="Hauptnavigation">
        {GUEST_LINKS.map((l) => (
          <NavLink key={l.href} href={l.href}>
            {l.label}
          </NavLink>
        ))}
        {isPlanner && (
          <NavLink href="/plan" className="nav-plan">
            Planung
          </NavLink>
        )}
      </nav>
      <form action={logout} className="nav-user">
        <span className="nav-user-name muted small">{userName}</span>
        <button className="btn btn-small">Abmelden</button>
      </form>
    </header>
  );
}
