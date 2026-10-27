import Link from "next/link";
import { notFound } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { rideTime } from "@/lib/rides";
import { RideForm, ChildChoices } from "../../ride-form";
import { DriverForm, Confirmation } from "../../driver-form";
import { HandoffPanel } from "../../handoff-panel";
import { DriverPanel } from "../../driver-panel";
import { ReplacementPanel } from "../../replacement-panel";
import { coverageLabel } from "@/lib/drivers";
export default async function RideDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ family?: string; after_replacement?: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) notFound();
  const query = await searchParams;
  const client = await createReadOnlyClient();
  const offers = await client.rpc("ride_offer", { p_id: id });
  if (offers.error) throw new Error("Ride could not be loaded");
  const offer = offers.data.find((item) => item.family_id === query.family) ?? (!query.family ? offers.data[0] : undefined);
  const driving = await client.rpc("driver_status",{ p_ride_id:id });
  if (driving.error) throw new Error("Driver status could not be loaded");
  const status = driving.data[0];
  const trip = await client.from("ride_trips").select("completed_at").eq("ride_id",id).maybeSingle();
  if (trip.error) throw new Error("Trip could not be loaded");
  const frozen = Boolean(trip.data);
  if (!offer && (status?.is_driver || status?.is_current_driver)) {
    const [exact, enrolled] = await Promise.all([client.from("ride_locations").select("pickup,destination").eq("ride_id",id).maybeSingle(),client.from("ride_riders").select("child_id,display_name,seat_requirement").eq("ride_id",id)]);
    if (exact.error || enrolled.error) throw new Error("Assignment could not be loaded");
    return <><h1>{status.pickup_summary} → {status.destination_summary}</h1><p>Pickup: {rideTime(status.starts_at,status.timezone)}<br />Drop-off: {rideTime(status.ends_at,status.timezone)}</p><DriverPanel status={status} />
      {exact.data ? <><h2>Exact locations</h2><p>Pickup: {exact.data.pickup}</p><p>Drop-off: {exact.data.destination}</p><h2>Enrolled riders</h2><ul>{enrolled.data.map((c) => <li key={c.child_id}>{c.display_name} · {c.seat_requirement}</li>)}</ul></> : <p>Only the minimal driver proposal is available. Exact private locations become available after confirmation.</p>}
      {exact.data && <HandoffPanel rideId={id} revision={status.ride_revision} timezone={status.timezone} isDriver={status.is_current_driver} cancelled={Boolean(status.cancelled_at)} />}</>;
  }
  if (!offer) return <><h1>Ride unavailable</h1><p>This ride is unavailable to this account or your family is no longer in its circle.</p></>;
  const [families, children, locations, riders, participation, roster, options, consents] = await Promise.all([
    client.from("families").select("id,name"),
    client.from("children").select("id,display_name").eq("family_id", offer.family_id).order("display_name"),
    client.from("ride_locations").select("pickup,destination").eq("ride_id", id).maybeSingle(),
    client.from("ride_riders").select("family_id,child_id,display_name,seat_requirement").eq("ride_id", id),
    client.from("ride_families").select("family_id,status").eq("ride_id", id),
    client.rpc("circle_roster", { p_circle_id: offer.circle_id }),
    client.rpc("driver_options", { p_ride_id:id }),
    client.from("ride_driver_consents").select("child_id,revoked_at").eq("ride_id",id).eq("family_id",offer.family_id).eq("proposal_id",status?.proposal_id ?? "00000000-0000-0000-0000-000000000000"),
  ]);
  if (families.error || children.error || locations.error || riders.error || participation.error || roster.error || options.error || consents.error) throw new Error("Ride details could not be loaded");
  const locked = frozen || status?.coverage === "confirmed" || status?.coverage === "awaiting_confirmation";
  const fields = { ride_id: id, family_id: offer.family_id, revision: String(offer.revision) };
  const familyName = (familyId: string) => families.data.find((f) => f.id === familyId)?.name ?? roster.data.find((f) => f.family_id === familyId)?.family_name ?? "Invited circle family";
  return <><h1>{offer.pickup_summary} → {offer.destination_summary}</h1>
    <p>{offer.direction === "return" ? "Return" : "Outbound"} · Revision {offer.revision} · {offer.cancelled_at ? "Cancelled" : trip.data?.completed_at ? "Ride completed" : coverageLabel(status?.coverage)}</p>
    <p>Pickup: <time dateTime={offer.starts_at}>{rideTime(offer.starts_at, offer.timezone)}</time><br />Drop-off: <time dateTime={offer.ends_at}>{rideTime(offer.ends_at, offer.timezone)}</time><br />Timezone: {offer.timezone}</p>
    <p>Family: {familyName(offer.family_id)} · Participation: {offer.status}</p>
    <nav aria-label="Your family contexts">{offers.data.map((item) => <Link key={item.family_id} href={`/app/rides/${id}?family=${item.family_id}`}>{familyName(item.family_id)}</Link>)}</nav>
    {offer.cancelled_at && <p role="status">The creator cancelled this ride. It cannot be reopened. No travel or driver assignment is implied.</p>}
    {locations.data ? <><h2>Exact locations</h2><p>Pickup: {locations.data.pickup}</p><p>Drop-off: {locations.data.destination}</p>
      <h2>Enrolled riders</h2>{riders.data.length ? <ul>{riders.data.map((rider) => <li key={rider.child_id}>{rider.display_name} · {rider.seat_requirement} · {familyName(rider.family_id)}</li>)}</ul> : <p>No riders currently enrolled.</p>}
      <h2>Family responses</h2><ul>{participation.data.map((item) => <li key={item.family_id}>{familyName(item.family_id)} · {item.status}</li>)}</ul>
    </> : <p>Only the minimal invitation summary is available. Exact pickup, drop-off and riders become visible when your family joins with its own child.</p>}
    {status && <DriverPanel status={status} />}
    {status && offer.status === "joined" && <ReplacementPanel status={status} familyId={offer.family_id} revision={offer.revision} frozen={frozen} options={options.data} after={query.after_replacement} />}
    {locations.data && <HandoffPanel rideId={id} revision={offer.revision} timezone={offer.timezone} isDriver={Boolean(status?.is_current_driver)} cancelled={Boolean(offer.cancelled_at)} />}
    {!offer.cancelled_at && offer.status === "joined" && <>
      {!locked && status?.current_assignment_release_reason !== "withdrawn" && <><h2>Nominate an initial driver</h2><p>Every invited family must respond first. Nomination freezes this roster and vehicle version; acceptance and each child’s consent are separate actions.</p>
        {options.data.length ? <DriverForm key={`nominate-${offer.revision}`} command="proposeDriver" fields={{ ...fields,proposal_id:crypto.randomUUID() }} label="Nominate driver">
          <label>Driver and registered vehicle<select name="driver_vehicle" required defaultValue=""><option value="" disabled>Choose a circle adult and vehicle</option>{options.data.map((v) => <option key={`${v.driver_id}-${v.driver_family_id}-${v.vehicle_id}`} value={[v.driver_id,v.driver_family_id,v.vehicle_id,v.vehicle_version].join("|")}>{v.display_name} · {v.vehicle_label} · {v.passenger_seats} passenger seats</option>)}</select></label>
          <Confirmation>I nominate this adult and vehicle for this ride’s current riders and plan.</Confirmation>
        </DriverForm> : <p>No eligible registered vehicles. An adult must <Link href="/app/vehicles">register their own vehicle</Link> first.</p>}
      </>}
      {status && (status.proposal_status === "pending" || status.proposal_status === "confirmed") && locked && !frozen && <>
        <h2>Consent for your children</h2><p>Approve {status.driver_name} in {status.vehicle_label}, vehicle version {status.vehicle_version}, for ride revision {status.ride_revision}. Driving acceptance does not give this consent. Circle membership and invitations do not give this consent.</p>
        <ul>{riders.data.filter((r) => r.family_id === offer.family_id).map((r) => <li key={r.child_id}>{r.display_name}: {consents.data.some((c) => c.child_id===r.child_id && !c.revoked_at) ? "Consent saved" : "Consent required"}</li>)}</ul>
        {status.proposal_status === "pending" && <DriverForm key={`consent-${status.proposal_id}`} command="consentForOwnChildren" fields={{ proposal_id:status.proposal_id,revision:String(status.ride_revision),family_id:offer.family_id }} label="Approve driver for selected children">
          <ChildChoices>{riders.data.filter((r) => r.family_id===offer.family_id).map((r) => ({ id:r.child_id,display_name:r.display_name }))}</ChildChoices>
          <Confirmation>I explicitly consent to this driver, vehicle and plan for my selected children.</Confirmation>
        </DriverForm>}
        {consents.data.some((c) => !c.revoked_at) && <DriverForm command="revokeOwnConsent" fields={{ proposal_id:status.proposal_id,revision:String(status.ride_revision),family_id:offer.family_id }} label="Revoke selected child consent">
          <ChildChoices>{riders.data.filter((r) => r.family_id===offer.family_id && consents.data.some((c) => c.child_id===r.child_id && !c.revoked_at)).map((r) => ({ id:r.child_id,display_name:r.display_name }))}</ChildChoices>
          <Confirmation>I revoke consent and {status.mode !== "initial" && status.proposal_status === "pending" ? "close this replacement request. An available original driver stays assigned." : "leave this ride needing a driver."}</Confirmation>
        </DriverForm>}
        {status.proposal_status === "pending" && <DriverForm command="cancelDriverProposal" fields={{ proposal_id:status.proposal_id,revision:String(status.ride_revision),family_id:offer.family_id }} label="Cancel driver proposal"><Confirmation>I cancel this nomination{status.mode !== "initial" ? ". An available original driver stays assigned." : " and release the roster for changes."}</Confirmation></DriverForm>}
      </>}
    </>}
    {!offer.cancelled_at && <>
      {!locked ? <>
      <h2>{offer.status === "joined" ? "Your family’s enrollment" : "Respond for your family"}</h2>
      <Link href={`/app/children?family=${offer.family_id}`}>Manage your children</Link>
      {offer.status === "joined" ? <RideForm key={`${offer.family_id}-${offer.revision}`} command="setOwnRideRiders" fields={fields} label="Save own riders">
        <ChildChoices selected={riders.data.filter((item) => item.family_id === offer.family_id).map((item) => item.child_id)}>{children.data}</ChildChoices>
        <p>Uncheck all children to withdraw your family. This removes your family’s access to exact trip details.</p>
      </RideForm> : <>
        {!!children.data.length && <RideForm key={`${offer.family_id}-${offer.revision}`} command="respondToRideInvitation" fields={{ ...fields, response: "join" }} label="Join with own riders"><ChildChoices>{children.data}</ChildChoices><p>Select at least one child.</p></RideForm>}
        <RideForm command="respondToRideInvitation" fields={{ ...fields, response: "decline" }} label="Decline ride" />
      </>}
      </> : <p>{frozen ? "The trip plan and roster are frozen. Ordinary changes are unavailable after first pickup." : "The roster is frozen. Cancel the proposal, withdraw as driver or revoke consent before changing riders. Changed plans require fresh consent."}</p>}
      {offer.can_cancel && !frozen && <><h2>Cancel this ride</h2><RideForm command="cancelRide" fields={fields} label="Cancel ride"><label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />I confirm cancellation for every family.</label></RideForm></>}
    </>}
    <Link href="/app/schedule">Weekly schedule</Link>
  </>;
}
