import Link from "next/link";
import { notFound } from "next/navigation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { rideTime } from "@/lib/rides";
import { RideForm, ChildChoices } from "../../ride-form";
export default async function RideDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ family?: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) notFound();
  const query = await searchParams;
  const client = await createReadOnlyClient();
  const offers = await client.rpc("ride_offer", { p_id: id });
  if (offers.error) throw new Error("Ride could not be loaded");
  const offer = offers.data.find((item) => item.family_id === query.family) ?? (!query.family ? offers.data[0] : undefined);
  if (!offer) return <><h1>Ride unavailable</h1><p>This ride is unavailable to this account or your family is no longer in its circle.</p></>;
  const [families, children, locations, riders, participation, roster] = await Promise.all([
    client.from("families").select("id,name"),
    client.from("children").select("id,display_name").eq("family_id", offer.family_id).order("display_name"),
    client.from("ride_locations").select("pickup,destination").eq("ride_id", id).maybeSingle(),
    client.from("ride_riders").select("family_id,child_id,display_name,seat_requirement").eq("ride_id", id),
    client.from("ride_families").select("family_id,status").eq("ride_id", id),
    client.rpc("circle_roster", { p_circle_id: offer.circle_id }),
  ]);
  if (families.error || children.error || locations.error || riders.error || participation.error || roster.error) throw new Error("Ride details could not be loaded");
  const fields = { ride_id: id, family_id: offer.family_id, revision: String(offer.revision) };
  const familyName = (familyId: string) => families.data.find((f) => f.id === familyId)?.name ?? roster.data.find((f) => f.family_id === familyId)?.family_name ?? "Invited circle family";
  return <><h1>{offer.pickup_summary} → {offer.destination_summary}</h1>
    <p>{offer.direction === "return" ? "Return" : "Outbound"} · Revision {offer.revision} · {offer.cancelled_at ? "Cancelled" : "Unassigned — needs a driver"}</p>
    <p>Pickup: <time dateTime={offer.starts_at}>{rideTime(offer.starts_at, offer.timezone)}</time><br />Drop-off: <time dateTime={offer.ends_at}>{rideTime(offer.ends_at, offer.timezone)}</time><br />Timezone: {offer.timezone}</p>
    <p>Family: {familyName(offer.family_id)} · Participation: {offer.status}</p>
    <nav aria-label="Your family contexts">{offers.data.map((item) => <Link key={item.family_id} href={`/app/rides/${id}?family=${item.family_id}`}>{familyName(item.family_id)}</Link>)}</nav>
    {offer.cancelled_at && <p role="status">The creator cancelled this ride. It cannot be reopened. No travel or driver assignment is implied.</p>}
    {locations.data ? <><h2>Exact locations</h2><p>Pickup: {locations.data.pickup}</p><p>Drop-off: {locations.data.destination}</p>
      <h2>Enrolled riders</h2>{riders.data.length ? <ul>{riders.data.map((rider) => <li key={rider.child_id}>{rider.display_name} · {rider.seat_requirement} · {familyName(rider.family_id)}</li>)}</ul> : <p>No riders currently enrolled.</p>}
      <h2>Family responses</h2><ul>{participation.data.map((item) => <li key={item.family_id}>{familyName(item.family_id)} · {item.status}</li>)}</ul>
    </> : <p>Only the minimal invitation summary is available. Exact pickup, drop-off and riders become visible when your family joins with its own child.</p>}
    {!offer.cancelled_at && <>
      <h2>{offer.status === "joined" ? "Your family’s enrollment" : "Respond for your family"}</h2>
      <Link href={`/app/children?family=${offer.family_id}`}>Manage your children</Link>
      {offer.status === "joined" ? <RideForm key={`${offer.family_id}-${offer.revision}`} command="setOwnRideRiders" fields={fields} label="Save own riders">
        <ChildChoices selected={riders.data.filter((item) => item.family_id === offer.family_id).map((item) => item.child_id)}>{children.data}</ChildChoices>
        <p>Uncheck all children to withdraw your family. This removes your family’s access to exact trip details.</p>
      </RideForm> : <>
        {!!children.data.length && <RideForm key={`${offer.family_id}-${offer.revision}`} command="respondToRideInvitation" fields={{ ...fields, response: "join" }} label="Join with own riders"><ChildChoices>{children.data}</ChildChoices><p>Select at least one child.</p></RideForm>}
        <RideForm command="respondToRideInvitation" fields={{ ...fields, response: "decline" }} label="Decline ride" />
      </>}
      {offer.can_cancel && <><h2>Cancel this ride</h2><RideForm command="cancelRide" fields={fields} label="Cancel ride"><label className="checkbox-label"><input type="checkbox" name="confirm" value="yes" required />I confirm cancellation for every family.</label></RideForm></>}
    </>}
    <Link href="/app/schedule">Weekly schedule</Link>
  </>;
}
