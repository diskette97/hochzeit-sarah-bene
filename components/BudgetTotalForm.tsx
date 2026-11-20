"use client";

import { useState, useTransition } from "react";
import { saveBudgetTotal } from "@/lib/actions";

export default function BudgetTotalForm({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial ? String(initial).replace(".", ",") : "");
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => setMsg((await saveBudgetTotal(value)) ?? null));
      }}
    >
      <label className="field">
        <span>Gesamtbudget (€)</span>
        <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="z. B. 17000" />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? "…" : "Speichern"}
      </button>
      {msg?.error && <span className="alert alert-error">{msg.error}</span>}
      {msg?.ok && <span className="alert alert-ok">{msg.ok}</span>}
    </form>
  );
}
