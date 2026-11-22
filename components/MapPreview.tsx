"use client";

import { useState } from "react";
import { mapsDirectionsUrl, mapsEmbedUrl, mapsSearchUrl } from "@/lib/maps";

/**
 * Kartenvorschau von Google Maps. Die Karte lädt erst nach Klick, damit beim Öffnen der Seite
 * keine Daten an Google gehen (Datenschutz). Die Links öffnen Google Maps in einem neuen Tab.
 */
export default function MapPreview({ query, title }: { query: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="map-preview">
      {open ? (
        <iframe
          className="map-frame"
          title={`Karte: ${title}`}
          src={mapsEmbedUrl(query)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <button type="button" className="map-placeholder" onClick={() => setOpen(true)} aria-label={`Kartenvorschau für ${title} laden`}>
          <span className="map-pin" aria-hidden="true">
            ⌖
          </span>
          <span>Kartenvorschau anzeigen</span>
          <span className="small muted">Beim Laden wird Google Maps kontaktiert.</span>
        </button>
      )}
      <p className="actions-row">
        <a className="btn btn-small" href={mapsSearchUrl(query)} target="_blank" rel="noopener noreferrer">
          In Google Maps öffnen ↗
        </a>
        <a className="btn btn-small" href={mapsDirectionsUrl(query)} target="_blank" rel="noopener noreferrer">
          Route ↗
        </a>
      </p>
    </div>
  );
}
