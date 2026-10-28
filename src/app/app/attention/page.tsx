import Link from "next/link";
import { EmptyState, PageHeading } from "../presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { RideList } from "../ride-list";
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
  const hasItems = trips.data.length || pending.length || joined.length || driverReplies.length;
  return <><PageHeading title="Needs attention" action={<Link className="button primary" href="/app/rides/new">＋ Plan a ride</Link>}>Family rides in the next year, driving requests and unfinished handoffs.</PageHeading>
    {!!trips.data.length && <><h2>Pickup and handoffs</h2>
    <ul>{trips.data.slice(0,25).map((t) => <li key={t.ride_id}><Link href={`/app/rides/${t.ride_id}`}>{t.pickup_summary} → {t.destination_summary}</Link><p>{t.awaiting_count ? `${t.awaiting_count} awaiting guardian receipt` : t.started_at ? "Trip in progress" : "Awaiting pickup"}{!!t.missing_recipient_count && ` · ${t.missing_recipient_count} receiving guardians needed`}{t.is_driver && " · You are the driver"}</p></li>)}</ul></>}
    {trips.data.length>25 && <Link href={`/app/attention?after_trip=${trips.data[24].ride_id}`}>Next pickup and handoff items</Link>}
    {after && <Link href="/app/attention">First pickup and handoff items</Link>}
    {!!pending.length && <><h2>Ride invitations</h2><RideList offers={pending} statuses={statuses.data} /></>}
    {!!joined.length && <><h2>Driver and family replies</h2><RideList offers={joined} statuses={statuses.data} /></>}
    {!!driverReplies.length && <><h2>Your driver replies</h2><ul>{driverReplies.map((p) => <li key={p.proposal_id}><Link href={`/app/rides/${p.ride_id}`}>{p.pickup_summary} → {p.destination_summary}</Link><p>{p.vehicle_label} · {p.rider_count} riders · {p.accepted_at ? "You accepted · Request pending" : "Your acceptance is needed"}</p></li>)}</ul></>}
    {inbox.data.length > 25 && <Link href="/app/driving?pending=1">See all pending driver requests</Link>}
    {!hasItems && <EmptyState title="No items in this view">Open your schedule to review other weeks.</EmptyState>}
    <Link className="text-link" href="/app/schedule">Weekly schedule <span aria-hidden="true">›</span></Link>
  </>;
}
