"use client";

import { useState, useTransition } from "react";
import { setUserPassword, updateUser } from "@/lib/actions";
import type { Profile } from "@/lib/session";

const ROLE_LABEL: Record<string, string> = { admin: "Admin (Brautpaar)", planer: "Planer (Trauzeugen/Helfer)", gast: "Gast" };
const STATUS_LABEL: Record<string, string> = { pending: "Wartet auf Freischaltung", approved: "Freigeschaltet", rejected: "Abgelehnt / gesperrt" };

function Row({ p, isMe }: { p: Profile; isMe: boolean }) {
  const [role, setRole] = useState(p.role);
  const [status, setStatus] = useState(p.status);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = role !== p.role || status !== p.status;

  const save = (r: string, s: string) =>
    startTransition(async () => {
      const res = await updateUser(p.id, r, s);
      setMsg(res?.error ?? "Gespeichert ✓");
    });

  return (
    <tr>
      <td data-label="Name">
        <div>
          <strong>{p.full_name || "–"}</strong> {isMe && <span className="pill">du</span>}
          <div className="muted small">{p.email}</div>
        </div>
      </td>
      <td data-label="Rolle">
        <select className="input" value={role} disabled={isMe} onChange={(e) => setRole(e.target.value as Profile["role"])}>
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td data-label="Status">
        <select className="input" value={status} disabled={isMe} onChange={(e) => setStatus(e.target.value as Profile["status"])}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td className="actions">
        {p.status === "pending" && !dirty && !isMe && (
          <button className="btn btn-primary btn-small" disabled={pending} onClick={() => { setStatus("approved"); save(role, "approved"); }}>
            Freischalten
          </button>
        )}
        {dirty && (
          <button className="btn btn-primary btn-small" disabled={pending} onClick={() => save(role, status)}>
            Speichern
          </button>
        )}
        {!isMe && (
          <button
            className="btn btn-small"
            disabled={pending}
            onClick={() => {
              const pw = window.prompt(`Neues Passwort für ${p.full_name || p.email} (mindestens 8 Zeichen):`);
              if (pw) startTransition(async () => { const res = await setUserPassword(p.id, pw); setMsg(res?.error ?? res?.ok ?? null); });
            }}
          >
            Passwort setzen
          </button>
        )}
        {msg && <span className="muted small">{msg}</span>}
      </td>
    </tr>
  );
}

export default function UserAdmin({ profiles, meId }: { profiles: Profile[]; meId: string }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Rolle</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <Row key={p.id} p={p} isMe={p.id === meId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
