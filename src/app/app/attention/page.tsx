import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideList } from "../ride-list";
export default async function Attention() {
  const client = await createReadOnlyClient();
  const now = new Date().getTime();
  const offers = await client.rpc("ride_offers", { p_from: new Date(now).toISOString(), p_until: new Date(now + 366 * 86400_000).toISOString() });
  if (offers.error) throw new Error("Attention items could not be loaded");
  const active = offers.data.filter((offer) => !offer.cancelled_at);
  const pending = active.filter((offer) => offer.status === "invited");
  const joined = active.filter((offer) => offer.status === "joined");
  return <><h1>Needs attention</h1><p>Upcoming and ongoing rides over the next year. Every ride is unassigned and needs a driver. Driver assignment is not available yet.</p>
    <h2>Pending family responses</h2>{pending.length ? <RideList offers={pending} /> : <p>No pending ride invitations.</p>}
    <h2>Participating rides needing a driver</h2>{joined.length ? <RideList offers={joined} /> : <p>No participating rides need attention.</p>}</>;
}
