"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { deleteRow, saveRow, toggleBool } from "@/lib/actions";
import { TABLES, type Field, type TableConfig, type TableKey } from "@/lib/schema";
import { sum } from "@/lib/calc";
import { dateDe, eur, safeUrl, timeDe } from "@/lib/format";

type Row = Record<string, string | number | boolean | null>;

function display(f: Field, v: Row[string]) {
  if (v === null || v === undefined || v === "") return "";
  switch (f.type) {
    case "money":
      return eur(Number(v));
    case "date":
      return dateDe(String(v), { month: "2-digit" });
    case "time":
      return timeDe(String(v));
    default:
      return String(v);
  }
}

function initialValues(fields: readonly Field[], row?: Row) {
  const v: Record<string, string | boolean> = {};
  for (const f of fields) {
    const raw = row?.[f.key];
    if (f.type === "bool") v[f.key] = Boolean(raw);
    else if (raw === null || raw === undefined) v[f.key] = f.type === "select" && !row && f.options?.[0] ? f.options[0] : "";
    else if (f.type === "time") v[f.key] = timeDe(String(raw));
    else v[f.key] = String(raw);
  }
  return v;
}

export default function CrudManager({ tableKey, rows, showSums = true }: { tableKey: TableKey; rows: Row[]; showSums?: boolean }) {
  const cfg: TableConfig = TABLES[tableKey];
  const fields = cfg.fields as readonly Field[];
  const listFields = fields.filter((f) => f.list);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => fields.some((f) => f.type !== "bool" && String(r[f.key] ?? "").toLowerCase().includes(q)));
  }, [rows, query, fields]);

  const groups = useMemo(() => {
    if (!cfg.groupBy) return [{ name: "", rows: filtered }];
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const g = String(r[cfg.groupBy] ?? "–");
      map.set(g, [...(map.get(g) ?? []), r]);
    }
    const groupField = fields.find((f) => f.key === cfg.groupBy);
    const order = groupField?.options ?? [];
    return [...map.entries()]
      .sort(([a], [b]) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b, "de");
      })
      .map(([name, rs]) => ({ name, rows: rs }));
  }, [filtered, cfg.groupBy, fields]);

  const sumFields = listFields.filter((f) => f.sum);

  function openForm(row: Row | null) {
    setEditing(row);
    setValues(initialValues(fields, row ?? undefined));
    setError(null);
    dialogRef.current?.showModal();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveRow(tableKey, editing ? String(editing.id) : null, values);
      if (res?.error) setError(res.error);
      else dialogRef.current?.close();
    });
  }

  function remove() {
    if (!editing) return;
    if (!confirm(`${cfg.singular} wirklich löschen?`)) return;
    startTransition(async () => {
      const res = await deleteRow(tableKey, String(editing.id));
      if (res?.error) setError(res.error);
      else dialogRef.current?.close();
    });
  }

  function cell(f: Field, r: Row) {
    const v = r[f.key];
    if (f.type === "bool") {
      return (
        <input
          type="checkbox"
          className="check"
          checked={Boolean(v)}
          aria-label={f.label}
          disabled={pending}
          onChange={(e) => startTransition(async () => void (await toggleBool(tableKey, String(r.id), f.key, e.target.checked)))}
        />
      );
    }
    if (f.type === "url") {
      const href = safeUrl(v as string | null);
      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="link">
          Link ↗
        </a>
      ) : null;
    }
    if (f.type === "select" && f.key !== "category") return v ? <span className={`pill pill-${String(v).split(" ")[0].toLowerCase()}`}>{String(v)}</span> : null;
    return <span className={f.type === "money" || f.type === "number" ? "num" : undefined}>{display(f, v)}</span>;
  }

  return (
    <section className="crud">
      <div className="crud-head">
        <h2>{cfg.title}</h2>
        <div className="crud-tools">
          <input type="search" className="input" placeholder="Suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>
            + Neu
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty">{cfg.emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {listFields.map((f) => (
                  <th key={f.key} className={f.type === "money" || f.type === "number" ? "num" : undefined}>
                    {f.label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.name || "all"}>
                {g.name && (
                  <tr className="group-row">
                    <th colSpan={listFields.length + 1}>
                      {g.name} <span className="muted">({g.rows.length})</span>
                    </th>
                  </tr>
                )}
                {g.rows.map((r) => (
                  <tr key={String(r.id)} className={r.done ? "row-done" : undefined}>
                    {listFields.map((f) => (
                      <td key={f.key} data-label={f.label} className={f.type === "money" || f.type === "number" ? "num" : undefined}>
                        {cell(f, r)}
                      </td>
                    ))}
                    <td className="actions">
                      <button type="button" className="btn btn-small" onClick={() => openForm(r)}>
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))}
                {showSums && g.name && sumFields.length > 0 && (
                  <tr className="subtotal-row">
                    {listFields.map((f, i) => (
                      <td key={f.key} data-label={i === 0 ? undefined : f.label} className={f.sum ? "num" : undefined}>
                        {i === 0 ? "Summe" : f.sum ? (f.type === "money" ? eur(sum(g.rows.map((r) => r[f.key] as number | null))) : sum(g.rows.map((r) => r[f.key] as number | null))) : ""}
                      </td>
                    ))}
                    <td />
                  </tr>
                )}
              </tbody>
            ))}
            {showSums && sumFields.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  {listFields.map((f, i) => (
                    <td key={f.key} data-label={i === 0 ? undefined : f.label} className={f.sum ? "num" : undefined}>
                      {i === 0 ? "Gesamt" : f.sum ? (f.type === "money" ? eur(sum(filtered.map((r) => r[f.key] as number | null))) : sum(filtered.map((r) => r[f.key] as number | null))) : ""}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <dialog ref={dialogRef} className="dialog" onClose={() => setError(null)}>
        <form onSubmit={submit} className="form">
          <h3>{editing ? `${cfg.singular} bearbeiten` : `${cfg.singular} hinzufügen`}</h3>
          {fields.map((f) => (
            <label key={f.key} className={f.type === "bool" ? "field field-check" : "field"}>
              <span>
                {f.label}
                {f.required && " *"}
              </span>
              {f.type === "textarea" ? (
                <textarea className="input" rows={3} value={String(values[f.key] ?? "")} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              ) : f.type === "select" ? (
                <select className="input" value={String(values[f.key] ?? "")} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o || "–"}
                    </option>
                  ))}
                </select>
              ) : f.type === "bool" ? (
                <input type="checkbox" className="check" checked={Boolean(values[f.key])} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })} />
              ) : (
                <input
                  className="input"
                  type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "url" ? "text" : "text"}
                  inputMode={f.type === "money" || f.type === "number" ? "decimal" : undefined}
                  placeholder={f.type === "url" ? "https://…" : f.type === "money" ? "z. B. 1250,50" : f.placeholder}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  required={f.required}
                />
              )}
            </label>
          ))}
          {error && <p className="alert alert-error">{error}</p>}
          <div className="form-actions">
            {editing && (
              <button type="button" className="btn btn-danger" onClick={remove} disabled={pending}>
                Löschen
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Speichert …" : "Speichern"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
