import CrudManager from "@/components/CrudManager";
import { listRows } from "@/lib/db";
import { requirePlanner } from "@/lib/session";

export default async function Page() {
  await requirePlanner();
  const data = await listRows("vendors");
  return (
    <>
      <h1>Dienstleister &amp; Angebote</h1>
      <p className="muted">Anbieter sammeln, Preise und Links hinterlegen, Status verfolgen.</p>
      <CrudManager tableKey="vendors" rows={data} />
    </>
  );
}
