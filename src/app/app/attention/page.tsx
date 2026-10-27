import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideList } from "../ride-list";
import { DriverPanel } from "../driver-panel";
export default async function Attention() {
  const client = await createReadOnlyClient();
  const now = new Date().getTime();
  const [offers,statuses] = await Promise.all([client.rpc("ride_offers", { p_from:new Date(now).toISOString(),p_until:new Date(now+366*86400_000).toISOString() }),client.rpc("driver_status",{})]);
  if (offers.error || statuses.error) throw new Error("Attention items could not be loaded");
  const active = offers.data.filter((offer) => !offer.cancelled_at);
  const pending = active.filter((offer) => offer.status === "invited");
  const joined = active.filter((offer) => offer.status === "joined" && statuses.data.find((p) => p.ride_id===offer.id)?.coverage !== "confirmed");
  const driverReplies = statuses.data.filter((p) => p.is_driver && p.coverage === "awaiting_confirmation" && Date.parse(p.ends_at)>now);
  return <><h1>Needs attention</h1><p>Upcoming and ongoing rides over the next year. Needs-driver, awaiting-confirmation and confirmed are separate states. A past pickup never implies completion. Refresh to see current replies.</p>
    <h2>Pending family responses</h2>{pending.length ? <RideList offers={pending} statuses={statuses.data} /> : <p>No pending ride invitations.</p>}
    <h2>Participating rides needing a driver</h2>{joined.length ? <RideList offers={joined} statuses={statuses.data} /> : <p>No participating rides need attention.</p>}
    <h2>Your pending driver confirmations</h2>{driverReplies.length ? driverReplies.map((p) => <article key={p.proposal_id}><h3>{p.pickup_summary} → {p.destination_summary}</h3><DriverPanel status={p} /></article>) : <p>No pending driver confirmations.</p>}
    <Link href="/app/driving">All your driving requests and assignments</Link>
  </>;
}
