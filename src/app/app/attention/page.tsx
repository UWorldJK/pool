import Link from "next/link";
import { PageHeading } from "../presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideList } from "../ride-list";
import { DriverPanel } from "../driver-panel";
export default async function Attention({ searchParams }: { searchParams: Promise<{ after_trip?: string }> }) {
  const query = await searchParams;
  const after = query.after_trip;
  if (after && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(after)) throw new Error("Invalid trip cursor");
  const client = await createReadOnlyClient();
  const now = new Date().getTime();
  const [offers,inbox,trips] = await Promise.all([client.rpc("ride_offers", { p_from:new Date(now).toISOString(),p_until:new Date(now+366*86400_000).toISOString() }),client.rpc("driver_inbox",{ p_pending_only:true,p_limit:26 }),client.rpc("trip_attention",{ p_after_id:after,p_limit:26 })]);
  if (offers.error || inbox.error || trips.error) throw new Error("Attention items could not be loaded");
  const statuses = await client.rpc("driver_statuses",{ p_ride_ids:[...new Set(offers.data.map((ride) => ride.id))] });
  if (statuses.error) throw new Error("Assignment statuses could not be loaded");
  const active = offers.data.filter((offer) => !offer.cancelled_at);
  const pending = active.filter((offer) => offer.status === "invited");
  const joined = active.filter((offer) => offer.status === "joined" && (statuses.data.find((p) => p.ride_id===offer.id)?.coverage !== "confirmed" || statuses.data.find((p) => p.ride_id===offer.id)?.proposal_status === "pending"));
  const driverReplies = inbox.data.slice(0,25);
  return <><PageHeading eyebrow="The next step is yours" title="Needs attention">Family rides over the next year and pending driver requests. Needs-driver, awaiting-confirmation and confirmed are separate states. A past pickup never implies completion. Refresh to see current replies.</PageHeading>
    <h2>Pickup and handoffs</h2><p>Manually reported progress. Unfinished trips remain here after their scheduled end. Arrival still requires explicit guardian receipt.</p>
    {trips.data.length ? <ul>{trips.data.slice(0,25).map((t) => <li key={t.ride_id}><Link href={`/app/rides/${t.ride_id}`}>{t.pickup_summary} → {t.destination_summary}</Link> · {t.started_at ? "Trip in progress" : "Awaiting pickup"} · {t.awaiting_count} awaiting receipt · {t.missing_recipient_count} missing active recipients{t.is_driver && " · You are the driver"}</li>)}</ul> : <p>No pickup or handoff items.</p>}
    {trips.data.length>25 && <Link href={`/app/attention?after_trip=${trips.data[24].ride_id}`}>Next pickup and handoff items</Link>}
    {after && <Link href="/app/attention">First pickup and handoff items</Link>}
    <h2>Pending family responses</h2>{pending.length ? <RideList offers={pending} statuses={statuses.data} /> : <p>No pending ride invitations.</p>}
    <h2>Participating rides needing a driver or replacement replies</h2>{joined.length ? <RideList offers={joined} statuses={statuses.data} /> : <p>No participating rides need attention.</p>}
    <h2>Your pending driver confirmations</h2>{driverReplies.length ? driverReplies.map((p) => <article key={p.proposal_id}><h3>{p.pickup_summary} → {p.destination_summary}</h3><DriverPanel status={p} /></article>) : <p>No pending driver confirmations.</p>}
    {inbox.data.length > 25 && <Link href="/app/driving?pending=1">See all pending driver requests</Link>}
    <Link href="/app/driving">All your driving requests and assignments</Link>
  </>;
}
