import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { DriverStatus } from "@/lib/drivers";
import { rideTime } from "@/lib/rides";
import { ChildChoices } from "./ride-form";
import { DriverForm, Confirmation } from "./driver-form";
type Option = Database["public"]["Functions"]["driver_options"]["Returns"][number];
export async function ReplacementPanel({ status, familyId, revision, frozen, options, after }: { status: DriverStatus; familyId: string; revision: number; frozen: boolean; options: Option[]; after?: string }) {
  if (after && (!/^\d{1,16}$/.test(after) || !Number.isSafeInteger(Number(after)) || Number(after)<1)) throw new Error("Invalid replacement history cursor");
  const client = await createReadOnlyClient();
  const [history, original] = await Promise.all([
    client.from("replacement_events").select("*").eq("ride_id",status.ride_id).gt("id",Number(after ?? 0)).order("id").limit(26),
    status.current_assignment_id ? client.from("driver_assignments").select("driver_id").eq("id",status.current_assignment_id).maybeSingle() : Promise.resolve({ data:null,error:null }),
  ]);
  if (original.error) throw new Error("Original assignment could not be loaded");
  const candidates = options.filter((v) => status.coverage !== "confirmed" || v.driver_id !== original.data?.driver_id);
  if (history.error) throw new Error("Replacement history could not be loaded");
  const pending = status.proposal_status === "pending";
  const assigned = status.coverage === "confirmed";
  const canRequest = assigned || status.current_assignment_release_reason === "withdrawn";
  const originalConsents = assigned && status.current_proposal_id !== status.proposal_id && !frozen
    ? await client.from("ride_driver_consents").select("child_id").eq("proposal_id",status.current_proposal_id).eq("family_id",familyId).is("revoked_at",null)
    : { data:[],error:null };
  if (originalConsents.error) throw new Error("Current assignment consent could not be loaded");
  const originalRiders = originalConsents.data.length
    ? await client.from("ride_riders").select("child_id,display_name").eq("ride_id",status.ride_id).in("child_id",originalConsents.data.map((c) => c.child_id))
    : { data:[],error:null };
  if (originalRiders.error) throw new Error("Current riders could not be loaded");
  const mode = assigned ? "optional_swap" : "unavailable";
  return <section aria-labelledby="replacement-review"><h2 id="replacement-review">Replacement requests and review</h2>
    <p>Choose a circle adult manually. Ask participants to open this ride and reply themselves; no notification delivery is implied. Reload for current replies and database-enforced expiry.</p>
    {frozen ? <p>Replacement is unavailable after any child’s pickup.</p> : pending ? <p>The current request must close before another can be nominated. Review the driver acceptance and child consent totals above; every enrolled child requires fresh consent.</p> : !status.cancelled_at && status.current_assignment_id && canRequest ? <>
      <p>{assigned ? "Optional swap: the available current driver stays assigned until a replacement is fully confirmed. Decline, cancellation and expiry preserve that assignment." : "Unavailable driver: this ride is uncovered. Only a fresh request with the actual driver acceptance and consent for every child can restore coverage."}</p>
      <DriverForm key={`replacement-${status.proposal_id}-${status.proposal_status}`} command="requestReplacement" fields={{ proposal_id:crypto.randomUUID(),ride_id:status.ride_id,family_id:familyId,revision:String(revision),mode,original_assignment_id:status.current_assignment_id,original_assignment_revision:String(status.current_assignment_revision) }} label="Request replacement">
        <label>Replacement driver and registered vehicle<select name="driver_vehicle" required defaultValue=""><option value="" disabled>Choose a circle adult and vehicle</option>{candidates.map((v) => <option key={`${v.driver_id}-${v.driver_family_id}-${v.vehicle_id}`} value={[v.driver_id,v.driver_family_id,v.vehicle_id,v.vehicle_version].join("|")}>{v.display_name} · {v.vehicle_label} · {v.passenger_seats} passenger seats</option>)}</select></label>
        <label>Review deadline in UTC<input name="deadline" type="text" required defaultValue={new Date(status.starts_at).toISOString()} aria-describedby="replacement-deadline-help" /></label>
        <p id="replacement-deadline-help">Use an explicit UTC instant, such as 2027-09-01T14:00:00Z. Deadline must be in the future and no later than pickup: {rideTime(status.starts_at,status.timezone)}. The database clock decides expiry.</p>
        <Confirmation>I request a replacement with fresh driver acceptance and consent for every enrolled child.</Confirmation>
      </DriverForm>
      {!candidates.length && <p>An eligible adult must <Link href="/app/vehicles">register a vehicle</Link> first.</p>}
    </> : <p>A replacement needs a current assignment or an assignment cleared by driver withdrawal. Nominate an initial driver when there is no previous driver assignment.</p>}
    {!!originalRiders.data.length && <><h3>Consent for the current assignment</h3><p>Your original consent for {status.current_driver_name} remains separate from this candidate request.</p>
      <DriverForm command="revokeOwnConsent" fields={{ proposal_id:status.current_proposal_id,revision:String(status.current_proposal_revision),family_id:familyId }} label="Revoke original driver consent">
        <ChildChoices>{originalRiders.data.map((r) => ({ id:r.child_id,display_name:r.display_name }))}</ChildChoices>
        <Confirmation>I revoke consent for the current driver and leave this ride needing a driver.</Confirmation>
      </DriverForm>
    </>}
    <h3>Replacement activity</h3>{history.data.length ? <ol>{history.data.slice(0,25).map((e) => <li key={e.id}>{e.kind} — {e.actor_name} at <time dateTime={e.occurred_at}>{rideTime(e.occurred_at,status.timezone)}</time> · Request {e.proposal_id}</li>)}</ol> : <p>No replacement requests on this page.</p>}
    {history.data.length>25 && <Link href={`/app/rides/${status.ride_id}?${new URLSearchParams({ family:familyId,after_replacement:String(history.data[24].id) })}`}>Next replacement activity</Link>}
    {after && <Link href={`/app/rides/${status.ride_id}?family=${familyId}`}>First replacement activity</Link>}
  </section>;
}
