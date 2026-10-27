import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideList } from "../ride-list";
import { DriverPanel } from "../driver-panel";
export default async function Attention() {
  const client = await createReadOnlyClient();
  const now = new Date().getTime();
  const [offers,inbox] = await Promise.all([client.rpc("ride_offers", { p_from:new Date(now).toISOString(),p_until:new Date(now+366*86400_000).toISOString() }),client.rpc("driver_inbox",{ p_pending_only:true,p_limit:26 })]);
  if (offers.error || inbox.error) throw new Error("Attention items could not be loaded");
  const statuses = await client.rpc("driver_statuses",{ p_ride_ids:[...new Set(offers.data.map((ride) => ride.id))] });
  if (statuses.error) throw new Error("Assignment statuses could not be loaded");
  const active = offers.data.filter((offer) => !offer.cancelled_at);
  const pending = active.filter((offer) => offer.status === "invited");
  const joined = active.filter((offer) => offer.status === "joined" && statuses.data.find((p) => p.ride_id===offer.id)?.coverage !== "confirmed");
  const driverReplies = inbox.data.slice(0,25);
  return <><h1>Needs attention</h1><p>Family rides over the next year and pending driver requests. Needs-driver, awaiting-confirmation and confirmed are separate states. A past pickup never implies completion. Refresh to see current replies.</p>
    <h2>Pending family responses</h2>{pending.length ? <RideList offers={pending} statuses={statuses.data} /> : <p>No pending ride invitations.</p>}
    <h2>Participating rides needing a driver</h2>{joined.length ? <RideList offers={joined} statuses={statuses.data} /> : <p>No participating rides need attention.</p>}
    <h2>Your pending driver confirmations</h2>{driverReplies.length ? driverReplies.map((p) => <article key={p.proposal_id}><h3>{p.pickup_summary} → {p.destination_summary}</h3><DriverPanel status={p} /></article>) : <p>No pending driver confirmations.</p>}
    {inbox.data.length > 25 && <Link href="/app/driving?pending=1">See all pending driver requests</Link>}
    <Link href="/app/driving">All your driving requests and assignments</Link>
  </>;
}
