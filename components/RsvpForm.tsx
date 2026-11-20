"use client";

import { useActionState } from "react";
import { submitRsvp } from "@/lib/actions";

type Rsvp = { name: string; attending: string; persons: number; companions: string | null; diet: string | null; song_wish: string | null; message: string | null };

export default function RsvpForm({ initial, defaultName }: { initial: Rsvp | null; defaultName: string }) {
  const [state, action, pending] = useActionState(submitRsvp, undefined);
  return (
    <form action={action} className="form">
      <label className="field">
        <span>Dein Name</span>
        <input className="input" name="name" required defaultValue={initial?.name ?? defaultName} />
      </label>
      <fieldset className="fieldset choice">
        <legend>Kommst du?</legend>
        <label>
          <input type="radio" name="attending" value="zusage" defaultChecked={initial?.attending === "zusage"} required /> Ja, ich komme
        </label>
        <label>
          <input type="radio" name="attending" value="absage" defaultChecked={initial?.attending === "absage"} /> Leider nicht
        </label>
      </fieldset>
      <label className="field">
        <span>Anzahl Personen (inkl. dir)</span>
        <input className="input" name="persons" type="number" min={1} max={10} defaultValue={initial?.persons && initial.persons > 0 ? initial.persons : 1} />
      </label>
      <label className="field">
        <span>Namen deiner Begleitung / Kinder</span>
        <input className="input" name="companions" defaultValue={initial?.companions ?? ""} />
      </label>
      <label className="field">
        <span>Essenswünsche / Unverträglichkeiten</span>
        <input className="input" name="diet" defaultValue={initial?.diet ?? ""} />
      </label>
      <label className="field">
        <span>Dein Lied für die Tanzfläche</span>
        <input className="input" name="song_wish" defaultValue={initial?.song_wish ?? ""} />
      </label>
      <label className="field">
        <span>Nachricht an uns</span>
        <textarea className="input" name="message" rows={3} defaultValue={initial?.message ?? ""} />
      </label>
      {state?.error && <p className="alert alert-error">{state.error}</p>}
      {state?.ok && <p className="alert alert-ok">{state.ok}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Speichert …" : initial ? "Rückmeldung aktualisieren" : "Rückmeldung senden"}
      </button>
    </form>
  );
}
