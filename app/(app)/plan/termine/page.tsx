import CrudManager from "@/components/CrudManager";
import { listRows } from "@/lib/db";
import { requirePlanner } from "@/lib/session";

export default async function Page() {
  await requirePlanner();
  const data = await listRows("dateOptions");
  return (
    <>
      <h1>Terminoptionen</h1>
      <p className="muted">Mögliche Hochzeitstermine mit Status, Optionsfrist und Noten (0–10). Das gewählte Datum tragt ihr unter „Gästeseite bearbeiten“ ein.</p>
      <CrudManager tableKey="dateOptions" rows={data} />
    </>
  );
}
