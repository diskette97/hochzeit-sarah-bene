import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="card auth-card">
        <p className="eyebrow">Hochzeit</p>
        <h1>Zugang anfragen</h1>
        <p className="muted">Nach der Registrierung schalten Sarah oder Bene dich frei. Erst danach siehst du die Inhalte.</p>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
