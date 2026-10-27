import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { rideTime } from "@/lib/rides";
import { driverPageCursor,driverNextPage } from "@/lib/drivers";
import { DriverPanel } from "../driver-panel";
export default async function Driving({ searchParams }: { searchParams:Promise<{ after_start?:string;after_id?:string;pending?:string }> }) {
  const client = await createReadOnlyClient();
  const query = await searchParams;
  const pendingOnly = query.pending === "1";
  let cursor:ReturnType<typeof driverPageCursor>;
  try { cursor = driverPageCursor(query); }
  catch { return <><h1>Your driving</h1><p role="alert">Invalid driving page. Open the first page and try again.</p><Link href="/app/driving">First page</Link></>; }
  const result = await client.rpc("driver_inbox",{ ...cursor,p_pending_only:pendingOnly,p_limit:26 });
  if (result.error) throw new Error("Driver requests could not be loaded");
  const own = result.data.slice(0,25);
  return <><h1>Your driving</h1><p>Proposals show only coarse route, times and necessary seat requirements. Exact private locations become available after confirmation. Refresh for current replies.</p><Link href="/app/vehicles">Manage your vehicles</Link>
    <nav aria-label="Driving filters"><Link href="/app/driving">All driving history</Link><Link href="/app/driving?pending=1">Pending driver requests</Link></nav>
    {own.length ? own.map((p) => <article key={p.proposal_id}><h2>{p.pickup_summary} → {p.destination_summary}</h2><p>Pickup: {rideTime(p.starts_at,p.timezone)}<br />Drop-off: {rideTime(p.ends_at,p.timezone)}</p><DriverPanel status={p} /></article>) : <p>No driver proposals on this page.</p>}
    <nav aria-label="Driving pages">{query.after_id && <Link href={pendingOnly ? "/app/driving?pending=1" : "/app/driving"}>First page</Link>}{result.data.length > 25 && <Link href={driverNextPage(own[own.length-1],pendingOnly)}>Next driving page</Link>}</nav>
  </>;
}
