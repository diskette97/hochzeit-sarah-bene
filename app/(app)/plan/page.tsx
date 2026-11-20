import Link from "next/link";
import { query } from "@/lib/db";
import { getSettings, requirePlanner } from "@/lib/session";
import { budgetSummary, costPerPerson, daysUntilWedding, guestSummary, taskProgress, toNum } from "@/lib/calc";
import { dateDe, eur } from "@/lib/format";

export default async function PlanDashboard() {
  const { profile } = await requirePlanner();
  const [budget, plan, tasks, guests, rsvps, pending, s] = await Promise.all([
    query<{ planned: number; actual: number | null; paid: number }>("select planned, actual, paid from budget_items"),
    query<{ value: string }>("select value from plan_settings where key = 'budget_total'"),
    query<{ id: string; title: string; done: boolean; due_date: string | null; assignee: string }>("select id, title, done, due_date, assignee from tasks"),
    query<{ rsvp: string; persons: number; invited: boolean }>("select rsvp, persons, invited from guests"),
    query<{ attending: string; persons: number }>("select attending, persons from rsvps"),
    profile.role === "admin" ? query<{ n: number }>("select count(*) as n from users where status = 'pending'") : Promise.resolve({ rows: [{ n: 0 }] }),
    getSettings(),
  ]);

  const b = budgetSummary(budget.rows, plan.rows[0]?.value);
  const t = taskProgress(tasks.rows);
  const g = guestSummary(guests.rows);
  const siteYes = rsvps.rows.filter((r) => r.attending === "zusage").reduce((a, r) => a + toNum(r.persons), 0);
  const siteNo = rsvps.rows.filter((r) => r.attending === "absage").length;
  const pendingCount = pending.rows[0]?.n ?? 0;
  const days = daysUntilWedding(s.wedding_date);
  const perPerson = costPerPerson(b.expected, g.yes || g.notDeclined);
  const nextTasks = tasks.rows
    .filter((x) => !x.done)
    .sort((a, b2) => (a.due_date ?? "9999").localeCompare(b2.due_date ?? "9999"))
    .slice(0, 6);

  return (
    <>
      <h1>Planung</h1>
      {pendingCount > 0 && (
        <p className="alert alert-info">
          {pendingCount} Person(en) warten auf Freischaltung. <Link href="/plan/benutzer">Jetzt prüfen →</Link>
        </p>
      )}
      <section className="stats">
        <article className="card stat">
          <p className="eyebrow">Hochzeit</p>
          <p className="big">{days === null ? "–" : days >= 0 ? days : 0}</p>
          <p className="muted small">{days === null ? "Datum noch nicht gesetzt" : days >= 0 ? `Tage · ${dateDe(s.wedding_date)}` : "Tage – schon gefeiert"}</p>
        </article>
        <article className="card stat">
          <p className="eyebrow">Budget</p>
          <p className="big">{eur(b.expected)}</p>
          <p className="muted small">
            {b.total > 0 ? (
              <>
                von {eur(b.total)} · {b.overBudget ? <strong className="bad">{eur(-b.remaining)} drüber</strong> : <>{eur(b.remaining)} frei</>}
              </>
            ) : (
              "Gesamtbudget noch nicht gesetzt"
            )}
          </p>
          {b.total > 0 && <progress className={b.overBudget ? "over" : ""} max={100} value={Math.min(b.usedPercent, 100)} />}
          <p className="muted small">Bezahlt: {eur(b.paid)} · Noch offen: {eur(b.openToPay)}</p>
        </article>
        <article className="card stat">
          <p className="eyebrow">Aufgaben</p>
          <p className="big">
            {t.done}/{t.total}
          </p>
          <progress max={100} value={t.percent} />
          <p className="muted small">{t.open} offen</p>
        </article>
        <article className="card stat">
          <p className="eyebrow">Gäste (Liste)</p>
          <p className="big">{g.yes}</p>
          <p className="muted small">
            Zusagen · {g.open} offen · {g.no} Absagen · {g.personsTotal} Personen gesamt
          </p>
          {perPerson !== null && <p className="muted small">≈ {eur(perPerson)} pro Person</p>}
        </article>
        <article className="card stat">
          <p className="eyebrow">Zusagen über die Seite</p>
          <p className="big">{siteYes}</p>
          <p className="muted small">Personen zugesagt · {siteNo} Absagen</p>
        </article>
      </section>

      <section className="card">
        <h2>Als Nächstes</h2>
        {nextTasks.length === 0 ? (
          <p className="muted">Keine offenen Aufgaben. 🎉</p>
        ) : (
          <ul className="plain">
            {nextTasks.map((x) => (
              <li key={x.id}>
                <strong>{x.title}</strong> <span className="muted small">{x.due_date ? `· fällig ${dateDe(x.due_date)}` : ""} · {x.assignee}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/plan/aufgaben" className="btn btn-small">
          Alle Aufgaben
        </Link>
      </section>
    </>
  );
}
