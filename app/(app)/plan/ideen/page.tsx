import CrudManager from "@/components/CrudManager";
import { listRows } from "@/lib/db";
import { requirePlanner } from "@/lib/session";

export default async function Page() {
  await requirePlanner();
  const data = await listRows("ideas");
  return (
    <>
      <h1>Ideen &amp; Merkliste</h1>
      <p className="muted">Inspiration, Deko, Outfits – mit Link und Preis.</p>
      <CrudManager tableKey="ideas" rows={data} />
    </>
  );
}
