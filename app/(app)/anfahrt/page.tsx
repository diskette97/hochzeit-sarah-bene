import MapPreview from "@/components/MapPreview";
import { listRows } from "@/lib/db";
import { eur, safeUrl } from "@/lib/format";
import { mapsSearchUrl, telHref } from "@/lib/maps";
import { getSettings, requireApproved } from "@/lib/session";

type Row = Record<string, string | number | boolean | null>;

const TIERS = [
  { key: "Günstig", title: "Günstig übernachten", lead: "Einfache Pensionen und Gästehäuser, meist mit Frühstück." },
  { key: "Komfort", title: "Komfortabel und gehoben", lead: "Hotels und gepflegte Gästehäuser mit mehr Ausstattung." },
  { key: "Camper", title: "Mit dem Camper", lead: "Stellplätze für Wohnmobile und Wohnwagen. Bitte vorher bei uns melden." },
] as const;

function priceText(a: Row): string | null {
  const from = a.price_per_night === null ? null : Number(a.price_per_night);
  const to = a.price_to === null || a.price_to === undefined ? null : Number(a.price_to);
  if (from === null) return null;
  if (from === 0) return "kostenlos";
  return to && to > from ? `${eur(from)} bis ${eur(to)} pro Nacht` : `ab ${eur(from)} pro Nacht`;
}

export default async function TravelPage() {
  await requireApproved();
  const s = await getSettings();
  const [spots, stays, taxis] = await Promise.all([listRows("parkingSpots"), listRows("accommodations"), listRows("taxis")]);
  const map = safeUrl(s.map_url);
  const venueUrl = safeUrl(s.venue_url);
  const venueQuery = [s.venue_name, s.venue_address].filter(Boolean).join(", ") || "Schloss Mattsee, Schloßberg 1, 5163 Mattsee";
  const mapLink = map ?? mapsSearchUrl(venueQuery);

  return (
    <>
      <h1>Anfahrt &amp; Unterkunft</h1>

      <section className="card" aria-labelledby="loc">
        <h2 id="loc">Location</h2>
        <p>
          <strong>{s.venue_name || "Schloss Mattsee"}</strong>
          <br />
          {s.venue_address || "Schloßberg 1, 5163 Mattsee"}
        </p>
        <MapPreview query={venueQuery} title="Location" />
        <p className="actions-row">
          {mapLink && (
            <a className="btn btn-small" href={mapLink} target="_blank" rel="noopener noreferrer">
              Karte der Location ↗
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

      <h2 id="parken">Parken</h2>
      <p className="muted">
        Das Schloss liegt in einer verkehrsbeschränkten Zone, direkt vor die Tür kommt man nicht. Die Parkplätze liegen am Ortsrand oder am See. Wer
        nicht gut zu Fuß ist, meldet sich bei uns.
      </p>
      {spots.length === 0 ? (
        <p className="empty">Parkplätze folgen.</p>
      ) : (
        <div className="grid">
          {spots.map((p) => {
            const q = typeof p.maps_query === "string" && p.maps_query ? p.maps_query : null;
            return (
              <article className="card" key={String(p.id)}>
                <p className="eyebrow">{String(p.audience)}</p>
                <h3>{String(p.name)}</h3>
                {p.address && <p>{String(p.address)}</p>}
                {p.walk_minutes !== null && Number(p.walk_minutes) > 0 && <p className="muted small">ca. {String(p.walk_minutes)} Minuten zu Fuß zum Schloss</p>}
                {p.fee && <p>{String(p.fee)}</p>}
                {p.capacity && <p className="muted small">{String(p.capacity)}</p>}
                {p.notes && <p className="pre small">{String(p.notes)}</p>}
                {q && <MapPreview query={q} title={String(p.name)} />}
              </article>
            );
          })}
        </div>
      )}

      <h2 id="uebernachten">Übernachten</h2>
      {stays.length === 0 ? (
        <p className="empty">Empfehlungen folgen.</p>
      ) : (
        TIERS.map((t) => {
          const list = stays.filter((a) => a.tier === t.key);
          if (list.length === 0) return null;
          return (
            <section key={t.key} aria-labelledby={`tier-${t.key}`}>
              <h3 id={`tier-${t.key}`}>{t.title}</h3>
              <p className="muted">{t.lead}</p>
              <div className="grid">
                {list.map((a) => {
                  const href = safeUrl(a.url as string | null);
                  const price = priceText(a);
                  const q = (typeof a.maps_query === "string" && a.maps_query) || [a.name, a.address].filter(Boolean).join(", ");
                  return (
                    <article className="card" key={String(a.id)}>
                      <p className="eyebrow">{String(a.type)}</p>
                      <h4>{String(a.name)}</h4>
                      {a.address && <p>{String(a.address)}</p>}
                      {a.distance && <p className="muted small">{String(a.distance)}</p>}
                      {price && <p className="price">{price}</p>}
                      {a.booking_code && (
                        <p>
                          Stichwort: <strong>{String(a.booking_code)}</strong>
                        </p>
                      )}
                      {a.notes && <p className="pre small">{String(a.notes)}</p>}
                      <p className="actions-row">
                        {a.phone && (
                          <a className="btn btn-small" href={telHref(String(a.phone))}>
                            {String(a.phone)}
                          </a>
                        )}
                        {href && (
                          <a className="btn btn-small" href={href} target="_blank" rel="noopener noreferrer">
                            Buchen ↗
                          </a>
                        )}
                        <a className="btn btn-small" href={mapsSearchUrl(String(q))} target="_blank" rel="noopener noreferrer">
                          Karte ↗
                        </a>
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
      <p className="muted small">
        Preise sind Richtwerte aus Buchungsportalen und von den Betrieben, Stand November 2026. Sie schwanken je nach Saison und Auslastung, bitte beim
        Buchen prüfen. Im Sommer sind die Zimmer am See früh vergeben.
      </p>

      <h2 id="taxi">Taxi</h2>
      {taxis.length === 0 ? (
        <p className="empty">Taxi-Nummern folgen.</p>
      ) : (
        <div className="grid">
          {taxis.map((t) => (
            <article className="card" key={String(t.id)}>
              <h3>{String(t.name)}</h3>
              {t.area && <p className="muted small">{String(t.area)}</p>}
              {t.phone && (
                <p>
                  <a className="btn btn-small" href={telHref(String(t.phone))}>
                    {String(t.phone)}
                  </a>
                </p>
              )}
              {t.notes && <p className="pre small">{String(t.notes)}</p>}
            </article>
          ))}
        </div>
      )}
      <p className="muted small">Am Hochzeitsabend sind Taxis in Mattsee knapp. Bitte vorher bestellen und die Rückfahrt gleich mit ausmachen.</p>
    </>
  );
}
