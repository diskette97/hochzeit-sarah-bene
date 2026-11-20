import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { TABLES, type TableKey } from "@/lib/schema";

// Typen so liefern, wie die App sie erwartet: date/time als Text, numeric als Zahl, int8 als Zahl.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => Number(v));
// timestamptz/timestamp als ISO-String (serialisierbar für Client-Komponenten). Sonderwerte wie "infinity"
// ergeben kein gültiges Datum → Rohtext statt RangeError (der sonst jede Abfrage der Zeile abbricht).
const iso = (d: Date, raw: string) => (Number.isNaN(d.getTime()) ? raw : d.toISOString());
types.setTypeParser(1184, (v) => iso(new Date(v), v));
types.setTypeParser(1114, (v) => iso(new Date(v + "Z"), v));

const g = globalThis as unknown as { __pgPool?: Pool };

function pool(): Pool {
  if (!g.__pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL fehlt.");
    g.__pgPool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
    g.__pgPool.on("error", (e) => console.error("Postgres-Pool:", e.message));
  }
  return g.__pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return pool().query<T>(text, params);
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
/** Bezeichner (Tabellen/Spalten) kommen ausschließlich aus lib/schema.ts, werden hier trotzdem geprüft. */
export function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error("Ungültiger Bezeichner.");
  return `"${name}"`;
}

type Order = { column: string; ascending?: boolean; nullsLast?: boolean };

/** Alle Zeilen einer konfigurierten Tabelle (Sortierung aus der Konfiguration). */
export async function listRows(key: TableKey, order?: Order) {
  const cfg = TABLES[key];
  const o = order ?? { column: cfg.orderBy, ascending: true };
  const sql = `select * from ${ident(cfg.table)} order by ${ident(o.column)} ${o.ascending === false ? "desc" : "asc"} ${o.nullsLast ? "nulls last" : ""}, ${ident("created_at")} asc`;
  const { rows } = await query(sql);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows as Record<string, any>[];
}
