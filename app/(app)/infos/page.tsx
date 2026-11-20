import { listRows } from "@/lib/db";
import { getSettings, requireApproved } from "@/lib/session";

export default async function InfoPage() {
  await requireApproved();
  const s = await getSettings();
  const faq = await listRows("faq");
  const infos = [
    { title: "Dresscode", text: s.dresscode },
    { title: "Kinder", text: s.kids_info },
    { title: "Geschenke", text: s.gifts_text },
  ].filter((i) => i.text);
  return (
    <>
      <h1>Infos &amp; FAQ</h1>
      {infos.length > 0 && (
        <div className="grid">
          {infos.map((i) => (
            <article className="card" key={i.title}>
              <h2>{i.title}</h2>
              <p className="pre">{i.text}</p>
            </article>
          ))}
        </div>
      )}
      <h2>Häufige Fragen</h2>
      {faq.length === 0 ? (
        <p className="empty">Noch keine Fragen eingetragen.</p>
      ) : (
        <div className="faq">
          {faq.map((f) => (
            <details key={f.id} className="card">
              <summary>{f.question}</summary>
              {f.answer && <p className="pre">{f.answer}</p>}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
