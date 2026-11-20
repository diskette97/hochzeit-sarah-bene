export default function SetupPage() {
  return (
    <main className="auth-page">
      <div className="card auth-card">
        <h1>Einrichtung fehlt</h1>
        <p>
          Die Datenbank ist noch nicht verbunden. Bitte <code>DATABASE_URL</code> setzen (siehe <code>.env.example</code> und
          README).
        </p>
      </div>
    </main>
  );
}
