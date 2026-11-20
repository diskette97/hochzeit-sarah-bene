import CrudManager from "@/components/CrudManager";
import { listRows } from "@/lib/db";
import { requirePlanner } from "@/lib/session";

export default async function Page() {
  await requirePlanner();
  const data = await listRows("tasks");
  return (
    <>
      <h1>Aufgaben</h1>
      <p className="muted">Checkliste nach Phasen. Häkchen setzen = erledigt.</p>
      <CrudManager tableKey="tasks" rows={data} />
    </>
  );
}
