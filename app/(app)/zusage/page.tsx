import RsvpForm from "@/components/RsvpForm";
import { query } from "@/lib/db";
import { getSettings, requireApproved } from "@/lib/session";
import { dateDe } from "@/lib/format";

export default async function RsvpPage() {
  const { user, profile } = await requireApproved();
  const s = await getSettings();
  const { rows } = await query<React.ComponentProps<typeof RsvpForm>["initial"] & object>("select * from rsvps where user_id = $1", [user.id]);
  const data = rows[0] ?? null;
  return (
    <>
      <h1>Zusage</h1>
      <p className="lead">
        {s.rsvp_deadline ? <>Bitte gib uns bis zum <strong>{dateDe(s.rsvp_deadline)}</strong> Bescheid.</> : "Bitte gib uns Bescheid, ob du dabei sein kannst."}
      </p>
      <div className="card narrow">
        <RsvpForm initial={data} defaultName={profile.full_name} />
      </div>
    </>
  );
}
