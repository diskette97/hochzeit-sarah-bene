import { query } from "@/lib/db";
import { requirePlanner } from "@/lib/session";

// CSV im Google-Kontakte-Format (Google Kontakte → Importieren). Nur für Planer.
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Tabellenkalkulationen führen Zellen mit =, +, -, @ als Formel aus.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  await requirePlanner();
  const { rows } = await query<{ name: string; group_name: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null }>(
    "select name, group_name, phone, email, address, notes from guests order by name",
  );
  const header = ["First Name", "Labels", "E-mail 1 - Value", "Phone 1 - Value", "Address 1 - Formatted", "Notes"];
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    const label = ["Hochzeit Sarah & Bene", r.group_name].filter(Boolean).join(" ::: ");
    lines.push([r.name, label, r.email, r.phone, r.address, r.notes].map(cell).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="gaeste-google-kontakte.csv"',
      "cache-control": "no-store",
    },
  });
}
