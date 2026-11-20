import CrudManager from "@/components/CrudManager";
import SettingsForm from "@/components/SettingsForm";
import { listRows } from "@/lib/db";
import { getSettings, requirePlanner } from "@/lib/session";

export default async function ContentPage() {
  await requirePlanner();
  const s = await getSettings();
  const [schedule, stays, faq, gifts] = await Promise.all([
    listRows("schedule", { column: "time", ascending: true, nullsLast: true }),
    listRows("accommodations"),
    listRows("faq"),
    listRows("gifts"),
  ]);
  return (
    <>
      <h1>Gästeseite bearbeiten</h1>
      <p className="muted">Alles, was Gäste sehen: Datum, Ort, Ablauf, Unterkünfte, FAQ und Wunschliste.</p>
      <div className="card">
        <SettingsForm initial={s} />
      </div>
      <CrudManager tableKey="schedule" rows={schedule} showSums={false} />
      <CrudManager tableKey="accommodations" rows={stays} showSums={false} />
      <CrudManager tableKey="faq" rows={faq} showSums={false} />
      <CrudManager tableKey="gifts" rows={gifts} />
    </>
  );
}
