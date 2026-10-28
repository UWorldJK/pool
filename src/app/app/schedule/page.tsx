import Link from "next/link";
import { PageHeading, EmptyState, ActionDialog } from "../presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { addDays, dateInZone, validTimezone, weekRange } from "@/lib/rides";
import { RideList } from "../ride-list";
export default async function Schedule({ searchParams }: { searchParams: Promise<{ date?: string; timezone?: string }> }) {
  const query = await searchParams;
  let range: ReturnType<typeof weekRange>, zone: string;
  try { zone = validTimezone(query.timezone || "UTC"); range = weekRange(query.date || dateInZone(new Date(), zone), zone); }
  catch { return <><h1>Weekly schedule</h1><p role="alert">Choose a valid date and IANA timezone.</p><Link href="/app/schedule">Open current week in UTC</Link></>; }
  const client = await createReadOnlyClient();
  const offers = await client.rpc("ride_offers", { p_from: range.from, p_until: range.until });
  if (offers.error) throw new Error("Schedule could not be loaded");
  const statuses = await client.rpc("driver_statuses",{ p_ride_ids:[...new Set(offers.data.map((ride) => ride.id))] });
  if (statuses.error) throw new Error("Assignment statuses could not be loaded");
  const weekLink = (date: string) => `/app/schedule?date=${date}&timezone=${encodeURIComponent(zone)}`;
  const unique = [...new Map(offers.data.map((ride) => [ride.id, ride])).values()];
  return <><PageHeading title="Schedule" action={<Link className="button primary" href="/app/rides/new">＋ Plan a ride</Link>}>Week of {new Intl.DateTimeFormat("en", { month:"long", day:"numeric", year:"numeric", timeZone:"UTC" }).format(new Date(`${range.monday}T12:00:00Z`))} · {zone}</PageHeading>
    <nav className="week-navigation" aria-label="Schedule weeks"><Link href={weekLink(addDays(range.monday, -7))}>← Previous week</Link><ActionDialog title="Choose week or timezone"><form className="auth-form week-filter"><fieldset><label>Week containing date<input type="date" name="date" defaultValue={range.monday} required /></label><label>Schedule timezone<input name="timezone" defaultValue={zone} required maxLength={100} /></label><button type="submit">Show week</button></fieldset></form></ActionDialog><Link href={weekLink(range.next)}>Next week →</Link></nav>
    <div className="week-strip" role="group" aria-label="Full week">{Array.from({ length:7 }, (_, index) => {
      const date = addDays(range.monday,index);
      const count = unique.filter((ride) => dateInZone(new Date(ride.starts_at),zone) === date).length;
      return <div className={`week-day${date === dateInZone(new Date(),zone) ? " today" : ""}`} key={date}><span>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][index]}</span><strong>{Number(date.slice(-2))}</strong><small>{count ? `${count} ${count === 1 ? "ride" : "rides"}` : "—"}</small></div>;
    })}</div>
    {offers.data.length ? <RideList offers={offers.data} statuses={statuses.data} /> : <EmptyState title="A little room in the week">No rides in this week. Plan a ride or wait for a family invitation.</EmptyState>}</>;
}
