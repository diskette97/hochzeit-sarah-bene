import { listRows } from "@/lib/db";
import { getSettings, requireApproved } from "@/lib/session";
import { eur, safeUrl } from "@/lib/format";

export default async function TravelPage() {
  await requireApproved();
  const s = await getSettings();
  const stays = await listRows("accommodations");
  const map = safeUrl(s.map_url);
  const venueUrl = safeUrl(s.venue_url);
  return (
    <>
      <h1>Anfahrt &amp; Unterkunft</h1>
      <section className="card">
        <h2>Location</h2>
        {s.venue_name || s.venue_address ? (
          <p>
            <strong>{s.venue_name}</strong>
            <br />
            {s.venue_address}
          </p>
        ) : (
          <p className="muted">Folgt.</p>
        )}
        <p className="actions-row">
          {map && (
            <a className="btn btn-small" href={map} target="_blank" rel="noopener noreferrer">
              Karte ↗
            </a>
          )}
          {venueUrl && (
            <a className="btn btn-small" href={venueUrl} target="_blank" rel="noopener noreferrer">
              Webseite ↗
            </a>
          )}
        </p>
        {s.arrival_info && (
          <>
            <h3>Anreise</h3>
            <p className="pre">{s.arrival_info}</p>
          </>
        )}
        {s.parking_info && (
          <>
            <h3>Parken</h3>
            <p className="pre">{s.parking_info}</p>
          </>
        )}
      </section>

      <h2>Übernachten</h2>
      {stays.length === 0 ? (
        <p className="empty">Empfehlungen folgen.</p>
      ) : (
        <div className="grid">
          {stays.map((a) => {
            const href = safeUrl(a.url);
            return (
              <article className="card" key={a.id}>
                <p className="eyebrow">{a.type}</p>
                <h3>{a.name}</h3>
                {a.address && <p>{a.address}</p>}
                {a.distance && <p className="muted small">{a.distance} zur Location</p>}
                {a.price_per_night !== null && <p className="price">ab {eur(Number(a.price_per_night))} / Nacht</p>}
                {a.booking_code && (
                  <p>
                    Stichwort: <strong>{a.booking_code}</strong>
                  </p>
                )}
                {a.notes && <p className="pre">{a.notes}</p>}
                {href && (
                  <a className="btn btn-small" href={href} target="_blank" rel="noopener noreferrer">
                    Zur Buchung ↗
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
