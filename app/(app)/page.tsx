import Link from "next/link";
import { getSettings, requireApproved } from "@/lib/session";
import { daysUntilWedding } from "@/lib/calc";
import { dateDe, safeUrl, timeDe } from "@/lib/format";

export default async function HomePage() {
  await requireApproved();
  const s = await getSettings();
  const days = daysUntilWedding(s.wedding_date);
  const mapUrl = safeUrl(s.map_url);
  const photos = safeUrl(s.photos_url);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Wir heiraten</p>
        <h1>
          <span className="hero-name">{s.bride_name || "Sarah"}</span> <span className="amp">&amp;</span>{" "}
          <span className="hero-name">{s.groom_name || "Bene"}</span>
        </h1>
        {s.wedding_date ? (
          <p className="hero-date">
            {dateDe(s.wedding_date, { weekday: "long" })}
            {s.wedding_time && ` · ${timeDe(s.wedding_time)} Uhr`}
          </p>
        ) : (
          <p className="hero-date">Datum folgt</p>
        )}
        {days !== null && (
          <p className="countdown">
            {days > 1 && <><strong>{days}</strong> Tage bis zur Hochzeit</>}
            {days === 1 && <>Morgen ist es soweit!</>}
            {days === 0 && <>Heute ist es soweit!</>}
            {days < 0 && <>Danke, dass ihr dabei wart!</>}
          </p>
        )}
        {s.welcome_text && <p className="lead">{s.welcome_text}</p>}
      </section>

      <section className="grid">
        <article className="card">
          <h2>Wo?</h2>
          {s.venue_name || s.venue_address ? (
            <>
              <p>
                <strong>{s.venue_name}</strong>
                <br />
                {s.venue_address}
              </p>
              {mapUrl && (
                <a className="btn btn-small" href={mapUrl} target="_blank" rel="noopener noreferrer">
                  Karte öffnen ↗
                </a>
              )}
            </>
          ) : (
            <p className="muted">Die Location geben wir bald bekannt.</p>
          )}
        </article>
        <article className="card">
          <h2>Zusagen bis</h2>
          <p>{s.rsvp_deadline ? dateDe(s.rsvp_deadline) : <span className="muted">Frist folgt</span>}</p>
          <Link className="btn btn-primary btn-small" href="/zusage">
            Jetzt zu- oder absagen
          </Link>
        </article>
        <article className="card">
          <h2>Dresscode</h2>
          <p>{s.dresscode || <span className="muted">Wird noch ergänzt.</span>}</p>
        </article>
        <article className="card">
          <h2>Fragen?</h2>
          {s.contact_name || s.contact_email || s.contact_phone ? (
            <p>
              {s.contact_name && <strong>{s.contact_name}</strong>}
              {s.contact_phone && <><br />{s.contact_phone}</>}
              {s.contact_email && <><br />{s.contact_email}</>}
            </p>
          ) : (
            <Link href="/infos">Zu den häufigen Fragen →</Link>
          )}
        </article>
      </section>

      {photos && (
        <p className="center">
          <a className="btn" href={photos} target="_blank" rel="noopener noreferrer">
            Foto-Album ansehen ↗
          </a>
        </p>
      )}
    </>
  );
}
