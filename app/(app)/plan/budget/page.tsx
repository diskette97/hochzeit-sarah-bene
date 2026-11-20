import BudgetTotalForm from "@/components/BudgetTotalForm";
import CrudManager from "@/components/CrudManager";
import { listRows, query } from "@/lib/db";
import { requirePlanner } from "@/lib/session";
import { budgetSummary } from "@/lib/calc";
import { eur } from "@/lib/format";

export default async function BudgetPage() {
  await requirePlanner();
  const [rows, plan] = await Promise.all([
    listRows("budget"),
    query<{ value: string }>("select value from plan_settings where key = 'budget_total'"),
  ]);
  const b = budgetSummary(rows as never, plan.rows[0]?.value);
  return (
    <>
      <h1>Budget</h1>
      <section className="card">
        <BudgetTotalForm initial={b.total} />
        <dl className="kv">
          <div><dt>Geplant (Summe)</dt><dd>{eur(b.planned)}</dd></div>
          <div><dt>Erwartet (Angebot/tatsächlich, sonst Plan)</dt><dd>{eur(b.expected)}</dd></div>
          <div><dt>Bereits bezahlt</dt><dd>{eur(b.paid)}</dd></div>
          <div><dt>Noch zu bezahlen</dt><dd>{eur(b.openToPay)}</dd></div>
          {b.total > 0 && (
            <div>
              <dt>{b.overBudget ? "Über Budget" : "Noch frei"}</dt>
              <dd className={b.overBudget ? "bad" : ""}>{eur(Math.abs(b.remaining))}</dd>
            </div>
          )}
        </dl>
      </section>
      <CrudManager tableKey="budget" rows={rows} />
    </>
  );
}
