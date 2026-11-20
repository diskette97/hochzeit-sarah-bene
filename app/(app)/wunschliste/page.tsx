import GiftList from "@/components/GiftList";
import { query } from "@/lib/db";
import { getSettings, requireApproved } from "@/lib/session";

export default async function WishlistPage() {
  const { user, profile } = await requireApproved();
  const s = await getSettings();
  const planner = profile.role !== "gast";
  // Gäste erfahren nie, WER etwas reserviert hat: für fremde Reservierungen kommt nur der Platzhalter "other".
  const { rows } = await query(
    `select g.id, g.title, g.description, g.url, g.price,
            case when g.reserved_by is null then null
                 when g.reserved_by = $1 then g.reserved_by::text
                 else 'other' end as reserved_by,
            case when $2::boolean then u.full_name else null end as reserved_name
       from gifts g left join users u on u.id = g.reserved_by
      order by g.created_at`,
    [user.id, planner],
  );
  return (
    <>
      <h1>Wunschliste</h1>
      {s.gifts_text && <p className="lead pre">{s.gifts_text}</p>}
      <GiftList gifts={rows as never} meId={user.id} isPlanner={planner} />
    </>
  );
}
