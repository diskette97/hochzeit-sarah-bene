import { listRows } from "@/lib/db";
import { requireApproved } from "@/lib/session";
import { timeDe } from "@/lib/format";

export default async function SchedulePage() {
  await requireApproved();
  const items = await listRows("schedule", { column: "time", ascending: true, nullsLast: true });
  return (
    <>
      <h1>Ablauf</h1>
      {items.length === 0 ? (
        <p className="empty">Der Ablauf folgt – wir tragen ihn rechtzeitig ein.</p>
      ) : (
        <ol className="timeline">
          {items.map((i) => (
            <li key={String(i.id)}>
              <span className="time">{timeDe(i.time as string | null) || "–"}</span>
              <div>
                <h3>{String(i.title)}</h3>
                {i.location && <p className="muted small">{String(i.location)}</p>}
                {i.description && <p>{String(i.description)}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
