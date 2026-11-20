import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logout } from "@/lib/actions";

export default async function WaitingPage() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile?.status === "approved") redirect("/");
  const rejected = profile?.status === "rejected";
  return (
    <main className="auth-page">
      <div className="card auth-card">
        <p className="eyebrow">Hochzeit</p>
        <h1>{rejected ? "Zugang nicht möglich" : "Fast geschafft"}</h1>
        <p>
          {rejected
            ? "Dein Zugang wurde nicht freigegeben. Wenn das ein Versehen ist, melde dich bitte direkt bei Sarah oder Bene."
            : "Dein Konto ist angelegt. Sobald Sarah oder Bene dich freigeschaltet haben, siehst du hier alle Inhalte. Schau einfach später noch einmal vorbei."}
        </p>
        <p className="muted small">Angemeldet als {profile?.email ?? user.email}</p>
        <form action={logout}>
          <button className="btn">Abmelden</button>
        </form>
      </div>
    </main>
  );
}
