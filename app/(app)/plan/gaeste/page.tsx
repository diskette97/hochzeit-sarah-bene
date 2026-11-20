import CrudManager from "@/components/CrudManager";
import { listRows } from "@/lib/db";
import { requirePlanner } from "@/lib/session";

export default async function Page() {
  await requirePlanner();
  const data = await listRows("guests");
  return (
    <>
      <h1>Gästeliste</h1>
      <p className="muted">Kategorie A = gesetzt, B = gerne, C = vielleicht.</p>
      <CrudManager tableKey="guests" rows={data} />
    </>
  );
}
