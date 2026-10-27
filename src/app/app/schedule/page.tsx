import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { addDays, dateInZone, validTimezone, weekRange } from "@/lib/rides";
import { RideList } from "../ride-list";
export default async function Schedule({ searchParams }: { searchParams: Promise<{ date?: string; timezone?: string }> }) {
  const query = await searchParams;
  let range: ReturnType<typeof weekRange>, zone: string;
  try { zone = validTimezone(query.timezone || "UTC"); range = weekRange(query.date || dateInZone(new Date(), zone), zone); }
  catch { return <><h1>Weekly schedule</h1><p role="alert">Choose a valid date and IANA timezone.</p><Link href="/app/schedule">Open current week in UTC</Link></>; }
  const client = await createReadOnlyClient();
  const [offers, statuses] = await Promise.all([client.rpc("ride_offers", { p_from: range.from, p_until: range.until }),client.rpc("driver_status",{})]);
  if (offers.error || statuses.error) throw new Error("Schedule could not be loaded");
  const weekLink = (date: string) => `/app/schedule?date=${date}&timezone=${encodeURIComponent(zone)}`;
  return <><h1>Weekly schedule</h1><p>Week of {range.monday} · {zone}. Both travel directions are shown. Ride times retain each ride’s timezone. A past pickup does not mean a ride completed.</p>
    <form className="auth-form"><label>Week containing date<input type="date" name="date" defaultValue={range.monday} required /></label><label>Schedule timezone<input name="timezone" defaultValue={zone} required maxLength={100} /></label><button type="submit">Show week</button></form>
    <nav aria-label="Schedule weeks"><Link href={weekLink(addDays(range.monday, -7))}>Previous week</Link><Link href={weekLink(range.next)}>Next week</Link></nav>
    {offers.data.length ? <RideList offers={offers.data} statuses={statuses.data} /> : <p>No rides in this week. Plan a ride or wait for a family invitation.</p>}<Link href="/app/rides/new">Plan a ride</Link></>;
}
