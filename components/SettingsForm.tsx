"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/actions";
import { SETTING_FIELDS } from "@/lib/schema";

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const groups = [...new Set(SETTING_FIELDS.map((f) => f.group))];

  return (
    <form
      className="form settings"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => setMsg((await saveSettings(Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== (initial[k] ?? ""))))) ?? null));
      }}
    >
      {groups.map((g) => (
        <fieldset key={g} className="fieldset">
          <legend>{g}</legend>
          {SETTING_FIELDS.filter((f) => f.group === g).map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              {f.type === "textarea" ? (
                <textarea className="input" rows={3} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              ) : (
                <input
                  className="input"
                  type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </fieldset>
      ))}
      {msg?.error && <p className="alert alert-error">{msg.error}</p>}
      {msg?.ok && <p className="alert alert-ok">{msg.ok}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Speichert …" : "Alles speichern"}
      </button>
    </form>
  );
}
