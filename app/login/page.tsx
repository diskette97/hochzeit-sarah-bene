import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="card auth-card">
        <p className="eyebrow">Hochzeit</p>
        <h1>
          Sarah <span className="amp">&amp;</span> Bene
        </h1>
        <p className="muted">Dieser Bereich ist privat. Bitte melde dich an.</p>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
