"use client";

import { useState, useTransition } from "react";
import { reserveGift } from "@/lib/actions";
import { eur, safeUrl } from "@/lib/format";

type Gift = { id: string; title: string; description: string | null; url: string | null; price: number | string | null; reserved_by: string | null; reserved_name: string | null };

export default function GiftList({ gifts, meId, isPlanner }: { gifts: Gift[]; meId: string; isPlanner: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (gifts.length === 0) return <p className="empty">Noch keine Wünsche eingetragen.</p>;
  return (
    <>
      {error && <p className="alert alert-error">{error}</p>}
      <ul className="gift-grid">
        {gifts.map((g) => {
          const mine = g.reserved_by === meId;
          const taken = g.reserved_by !== null && !mine;
          const href = safeUrl(g.url);
          return (
            <li key={g.id} className={`card gift ${taken ? "gift-taken" : ""}`}>
              <h3>{g.title}</h3>
              {g.description && <p>{g.description}</p>}
              {g.price !== null && <p className="price">{eur(Number(g.price))}</p>}
              <div className="gift-actions">
                {href && (
                  <a className="btn btn-small" href={href} target="_blank" rel="noopener noreferrer">
                    Ansehen ↗
                  </a>
                )}
                {!g.reserved_by && (
                  <button
                    className="btn btn-primary btn-small"
                    disabled={pending}
                    onClick={() => startTransition(async () => setError((await reserveGift(g.id, true))?.error ?? null))}
                  >
                    Ich schenke das
                  </button>
                )}
                {(mine || (taken && isPlanner)) && (
                  <button className="btn btn-small" disabled={pending} onClick={() => startTransition(async () => setError((await reserveGift(g.id, false))?.error ?? null))}>
                    {mine ? "Reservierung aufheben" : "Reservierung lösen"}
                  </button>
                )}
              </div>
              {mine && <p className="muted small">Von dir reserviert ✓</p>}
              {taken && <p className="muted small">Schon reserviert{isPlanner && g.reserved_name ? ` (${g.reserved_name})` : ""}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
