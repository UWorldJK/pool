import Link from "next/link";
import { PageHeading } from "../../presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideForm, ChildChoices, LocalTimeField } from "../../ride-form";
export default async function NewRide({ searchParams }: { searchParams: Promise<{ family?: string; circle?: string }> }) {
  const query = await searchParams;
  const client = await createReadOnlyClient();
  const [families, circles, memberships] = await Promise.all([client.from("families").select("id,name").order("name"), client.from("circles").select("id,name").order("name"), client.from("circle_families").select("family_id,circle_id")]);
  if (families.error || circles.error || memberships.error) throw new Error("Ride context could not be loaded");
  const contexts = families.data.flatMap((family) => circles.data.filter((circle) => memberships.data.some((m) => m.family_id === family.id && m.circle_id === circle.id)).map((circle) => ({ family, circle })));
  const context = query.family || query.circle ? contexts.find((item) => item.family.id === query.family && item.circle.id === query.circle) : contexts[0];
  if (!context) return <><h1>Plan a ride</h1><p>Join a circle with your family before planning. Choose a valid family and circle.</p><Link href="/app">Families and circles</Link></>;
  const { family, circle } = context;
  const [children, roster] = await Promise.all([client.from("children").select("id,display_name").eq("family_id", family.id).order("display_name"), client.rpc("circle_roster", { p_circle_id: circle.id })]);
  if (children.error || roster.error) throw new Error("Riders could not be loaded");
  return <div className="ride-plan"><PageHeading title="Plan a ride">{family.name} · {circle.name}</PageHeading>
    {contexts.length > 1 && <nav aria-label="Planning context">{contexts.map((item) => <Link key={`${item.family.id}-${item.circle.id}`} href={`/app/rides/new?family=${item.family.id}&circle=${item.circle.id}`}>{item.family.name} · {item.circle.name}</Link>)}</nav>}
    {!children.data.length ? <p>Add at least one of your own children in <Link href={`/app/children?family=${family.id}`}>child setup</Link> before planning.</p> : <RideForm key={`${family.id}-${circle.id}`} command="createRide" fields={{ ride_id: crypto.randomUUID(), family_id: family.id, circle_id: circle.id }} label="Create ride">
      <div className="form-section"><h2>Route</h2><label>Travel direction<select name="direction" required><option value="outbound">Outbound</option><option value="return">Return</option></select></label>
      <p>Use general place names in the summaries. Invited families can see them before joining.</p>
      <div className="form-pair"><label>Pickup summary<input name="pickup_summary" required maxLength={80} placeholder="Neighborhood meeting area" /></label>
      <label>Drop-off summary<input name="destination_summary" required maxLength={80} placeholder="Activity area" /></label></div>
      <p>Exact locations stay with participating families and the confirmed driver.</p>
      <div className="form-pair"><label>Exact pickup<input name="pickup" required maxLength={300} /></label>
      <label>Exact drop-off<input name="destination" required maxLength={300} /></label></div>
      </div><div className="form-section"><h2>Time</h2><label>IANA timezone<input name="timezone" defaultValue="UTC" required maxLength={100} placeholder="America/Denver" /></label>
      <div className="form-pair"><div><LocalTimeField name="starts" label="Pickup time" /></div><div><LocalTimeField name="ends" label="Drop-off time" /></div></div>
      <p>Times use the selected timezone.</p></div><div className="form-section"><h2>Riders</h2>
      <ChildChoices>{children.data}</ChildChoices>
      <fieldset><legend>Invite other circle families</legend>{roster.data.filter((item) => item.family_id !== family.id).map((item) => <label className="checkbox-label" key={item.family_id}><input type="checkbox" name="invited_family_ids" value={item.family_id} />{item.family_name}</label>)}<p>Each family chooses its own riders and approves the driver separately.</p></fieldset></div>
    </RideForm>}</div>;
}
