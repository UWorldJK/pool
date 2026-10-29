import { createReadOnlyClient } from "@/lib/supabase/server";
import { progressLabel } from "@/lib/handoffs";
import { rideTime } from "@/lib/rides";
import { HandoffForm } from "./handoff-form";
import { Confirmation } from "./driver-form";
export async function HandoffPanel({ rideId, revision, timezone, isDriver, cancelled }: { rideId: string; revision: number; timezone: string; isDriver: boolean; cancelled: boolean }) {
  const client = await createReadOnlyClient();
  const [user, riders, handoffs, trip, events] = await Promise.all([
    client.auth.getUser(),
    client.from("ride_riders").select("child_id,family_id,display_name").eq("ride_id",rideId).order("display_name"),
    client.from("ride_handoffs").select("*").eq("ride_id",rideId),
    client.from("ride_trips").select("*").eq("ride_id",rideId).maybeSingle(),
    client.from("ride_events").select("*").eq("ride_id",rideId).order("occurred_at").order("child_id"),
  ]);
  if (riders.error || handoffs.error || trip.error || events.error || user.error) throw new Error("Trip progress could not be loaded");
  if (!riders.data.length) return null;
  const guardians = await client.from("family_members").select("family_id,user_id").in("family_id",[...new Set(riders.data.map((r) => r.family_id))]).is("removed_at",null);
  if (guardians.error) throw new Error("Guardians could not be loaded");
  const profiles = await client.from("profiles").select("id,display_name").in("id",[...new Set(guardians.data.map((g) => g.user_id))]);
  if (profiles.error) throw new Error("Guardian names could not be loaded");
  const actor = user.data.user?.id;
  const started = Boolean(trip.data);
  return <section aria-labelledby="trip-progress"><h2 id="trip-progress">Manually reported trip progress</h2>
    <p>Adults report pickup and arrival. Each designated guardian must separately confirm actual receipt of their child. Refresh for saved reports. These reports do not provide live tracking, automatic arrival detection or a safety guarantee.</p>
    <p role="status">{trip.data?.completed_at ? "Ride completed — every child’s handoff is confirmed." : started ? "Trip in progress — handoffs remain." : "Trip has not started. Every child needs a designated guardian before first pickup."}</p>
    {started && <p>The active plan is frozen. Ordinary cancellation, withdrawal, consent revocation, recipient changes and removal of responsible memberships are unavailable.</p>}
    <ul>{riders.data.map((rider) => {
      const h = handoffs.data.find((item) => item.child_id===rider.child_id);
      const own = guardians.data.some((g) => g.family_id===rider.family_id && g.user_id===actor);
      const fields = { ride_id:rideId,child_id:rider.child_id,revision:String(revision),version:String(h?.version ?? 0) };
      const recipient = h?.recipient_id === actor && own;
      return <li key={rider.child_id}><article aria-label={`Journey for ${rider.display_name}`}>
        <h3 id={`journey-${rideId}-${rider.child_id}`} tabIndex={-1}>{rider.display_name}</h3><p aria-live="polite" aria-atomic="true"><strong>{progressLabel(h?.status)}</strong> · Recipient: {h?.recipient_name ?? "Not designated"}</p>
        {h?.picked_up_at && <p>Pickup reported: <time dateTime={h.picked_up_at}>{rideTime(h.picked_up_at,timezone)}</time></p>}
        {h?.arrived_at && <p>Arrival reported: <time dateTime={h.arrived_at}>{rideTime(h.arrived_at,timezone)}</time>. {h.status!=="completed" && "Guardian receipt is still required."}</p>}
        {h?.completed_at && <p>Receipt confirmed: <time dateTime={h.completed_at}>{rideTime(h.completed_at,timezone)}</time></p>}
        {!started && own && h && !guardians.data.some((g) => g.family_id===rider.family_id && g.user_id===h.recipient_id) && <p role="alert">The designated guardian is no longer active. Choose a current guardian before pickup.</p>}
        {!started && !cancelled && own && <HandoffForm key={`recipient-${rider.child_id}`} command="designateRecipient" fields={fields} label="Save designated guardian">
          <label>Designated guardian for {rider.display_name}<select key={h?.recipient_id ?? "none"} name="recipient_id" defaultValue={h?.recipient_id ?? ""} required><option value="" disabled>Choose an active guardian</option>{guardians.data.filter((g) => g.family_id===rider.family_id).map((g) => <option key={g.user_id} value={g.user_id}>{profiles.data.find((p) => p.id===g.user_id)?.display_name ?? "Guardian"}{g.user_id===actor ? " (you)" : ""}</option>)}</select></label>
          <Confirmation>I designate this guardian to receive {rider.display_name}. A guardian who drives must still explicitly confirm receipt.</Confirmation>
        </HandoffForm>}
        {!cancelled && isDriver && h?.status==="scheduled" && <HandoffForm key={`pickup-${rider.child_id}-${h.version}`} command="recordPickup" fields={{ ...fields,request_id:crypto.randomUUID() }} label="Report pickup">
          <Confirmation>I report that I picked up {rider.display_name}. First pickup freezes this ride’s plan and responsibilities.</Confirmation>
        </HandoffForm>}
        {!cancelled && isDriver && h?.status==="picked_up" && <HandoffForm key={`arrival-${rider.child_id}-${h.version}`} command="reportArrival" fields={{ ...fields,request_id:crypto.randomUUID() }} label="Report arrival">
          <Confirmation>I report arrival for {rider.display_name}. Arrival does not confirm guardian receipt.</Confirmation>
        </HandoffForm>}
        {!cancelled && recipient && h?.status==="awaiting_handoff" && <HandoffForm key={`receipt-${rider.child_id}-${h.version}`} command="confirmHandoff" fields={{ ...fields,request_id:crypto.randomUUID() }} label="Confirm child received">
          <Confirmation>I explicitly confirm that I have received {rider.display_name}.</Confirmation>
        </HandoffForm>}
        {h?.status==="awaiting_handoff" && !recipient && <p>Awaiting explicit receipt from {h.recipient_name}. Driving or family membership alone does not authorize this receipt.</p>}
      </article></li>;
    })}</ul>
    <h2>Ride activity</h2>{events.data.length ? <ol>{events.data.map((event) => <li key={event.request_id}>{riders.data.find((r) => r.child_id===event.child_id)?.display_name}: {progressLabel(event.kind)} — reported by {event.actor_name} at <time dateTime={event.occurred_at}>{rideTime(event.occurred_at,timezone)}</time> ({event.occurred_at}).</li>)}</ol> : <p>No pickup, arrival or receipt reports yet.</p>}
  </section>;
}
