import { query } from "@/lib/db";
import { requirePlanner } from "@/lib/session";
import { toNum } from "@/lib/calc";

const LABEL: Record<string, string> = { zusage: "Zusage", absage: "Absage", offen: "Offen" };

export default async function RsvpAdminPage() {
  await requirePlanner();
  const { rows } = await query("select * from rsvps order by updated_at desc");
  const yes = rows.filter((r) => r.attending === "zusage").reduce((a, r) => a + toNum(r.persons), 0);
  return (
    <>
      <h1>Zusagen der Gäste</h1>
      <p className="muted">
        Eingegangen über die Seite: {rows.length} Rückmeldungen · {yes} Personen mit Zusage.
      </p>
      {rows.length === 0 ? (
        <p className="empty">Noch keine Rückmeldungen.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Antwort</th>
                <th className="num">Personen</th>
                <th>Begleitung</th>
                <th>Essen</th>
                <th>Musikwunsch</th>
                <th>Nachricht</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Name">{r.name}</td>
                  <td data-label="Antwort">
                    <span className={`pill pill-${r.attending}`}>{LABEL[r.attending]}</span>
                  </td>
                  <td data-label="Personen" className="num">{r.persons}</td>
                  <td data-label="Begleitung">{r.companions}</td>
                  <td data-label="Essen">{r.diet}</td>
                  <td data-label="Musikwunsch">{r.song_wish}</td>
                  <td data-label="Nachricht">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
