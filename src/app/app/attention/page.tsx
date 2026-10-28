import Link from "next/link";
import { Avatar, EmptyState, Icon, PageHeading, RouteSummary, StatusBadge } from "../presentation";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { rideTime } from "@/lib/rides";
import { RideList } from "../ride-list";
export default async function Attention({ searchParams }: { searchParams: Promise<{ after_trip?: string }> }) {
  const query = await searchParams;
  const after = query.after_trip;
  if (after && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(after)) throw new Error("Invalid trip cursor");
  const client = await createReadOnlyClient();
  const now = new Date().getTime();
  const [offers,inbox,trips] = await Promise.all([client.rpc("ride_offers", { p_from:new Date(now).toISOString(),p_until:new Date(now+366*86400_000).toISOString() }),client.rpc("driver_inbox",{ p_pending_only:true,p_limit:26 }),client.rpc("trip_attention",{ p_after_id:after,p_limit:26 })]);
  if (offers.error || inbox.error || trips.error) throw new Error("Attention items could not be loaded");
  const ids = [...new Set(offers.data.map((ride) => ride.id))];
  const [statuses, tripRecords] = await Promise.all([
    client.rpc("driver_statuses",{ p_ride_ids:ids }),
    ids.length ? client.from("ride_trips").select("ride_id").in("ride_id",ids) : { data:[],error:null },
  ]);
  if (statuses.error || tripRecords.error) throw new Error("Assignment or trip statuses could not be loaded");
  const active = offers.data.filter((offer) => !offer.cancelled_at);
  const pending = active.filter((offer) => offer.status === "invited");
  const joined = active.filter((offer) => offer.status === "joined" && (statuses.data.find((p) => p.ride_id===offer.id)?.coverage !== "confirmed" || statuses.data.find((p) => p.ride_id===offer.id)?.proposal_status === "pending"));
  const driverReplies = inbox.data.slice(0,25);
  const count = new Set([...trips.data.map((t) => t.ride_id),...pending.map((r) => r.id),...joined.map((r) => r.id),...driverReplies.map((r) => r.ride_id)]).size;
  const featured = trips.data.find((t) => t.awaiting_count) || trips.data.find((t) => t.started_at) || trips.data[0];
  const featuredStatus = featured ? await client.rpc("driver_status",{p_ride_id:featured.ride_id}) : null;
  if (featuredStatus?.error) throw new Error("Current trip could not be loaded");
  const driver = featuredStatus?.data[0];
  const currentDriver = driver?.coverage === "confirmed" ? driver.current_driver_name || driver.driver_name : null;
  const upcoming = [...new Map(active.filter((r) => !tripRecords.data.some((t) => t.ride_id === r.id) && statuses.data.some((s) => s.ride_id === r.id && s.coverage === "confirmed" && s.proposal_status !== "pending")).map((r) => [r.id,r])).values()].slice(0,4);
  return <>
    <PageHeading eyebrow="YOUR FAMILY, IN THE LOOP" title={featured?.awaiting_count ? "A handoff needs your attention." : featured?.started_at ? "Your family is on the way." : "A little planning goes a long way."} action={<Link className="button secondary" href="/app/rides/new">＋ Plan a ride</Link>}>{featured?.awaiting_count ? "Arrival is reported. Confirm only when your own child is with you." : "Your rides, your circle and the next step — together."}</PageHeading>
    {featured && <div className="ride-overview trip-feature">
      <section className="panel"><div className="section-head"><p className="eyebrow">CURRENT RIDE</p><StatusBadge tone={featured.awaiting_count ? "attention" : "positive"}>{featured.awaiting_count ? "Handoff needed" : featured.started_at ? "Trip in progress" : "Awaiting pickup"}</StatusBadge></div>
        <h2>To {featured.destination_summary}</h2><RouteSummary pickup={featured.pickup_summary} destination={featured.destination_summary} />
        <p className="feature-state">{featured.awaiting_count ? "Handoff needed" : featured.started_at ? "On the way" : "Before pickup"}</p>
        {currentDriver && <div className="person-meta"><Avatar name={currentDriver} tone="rose" /><div><strong>{currentDriver}</strong><p>Current driver{driver?.current_proposal_id === driver?.proposal_id && ` · ${driver?.vehicle_label}`}</p></div></div>}
        <Link className="button primary" href={`/app/rides/${featured.ride_id}#trip-progress`}>Review {featured.awaiting_count ? "handoffs" : "ride"} <span aria-hidden="true">→</span></Link>
      </section>
      <div className="feature-details"><Icon name="shield" size={28} /><h3>{featured.awaiting_count ? `${featured.awaiting_count} awaiting guardian receipt` : "Every child has their own handoff"}</h3><p>{featured.awaiting_count ? "The ride remains in progress. Each designated guardian confirms receipt for their own child." : "Pickup, arrival and receipt are separate saved reports. A scheduled time never completes a ride."}</p>{driver && <p>Pickup: {rideTime(driver.starts_at,driver.timezone)}<br />Drop-off: {rideTime(driver.ends_at,driver.timezone)}</p>}<p className="section-caption">Manually reported · Reload for updates</p></div>
    </div>}
    <section className="attention-tasks"><div className="section-head"><h2 aria-label="Needs attention">Needs attention <span className="number" aria-hidden="true">{count}</span></h2><span className="section-caption">One clear next step</span></div>
      {!!trips.data.length && <><h3>Pickup and handoffs</h3><ul className="task-list">{trips.data.slice(0,25).map((t) => <li key={t.ride_id}><span className="task-icon"><Icon name="home" /></span><div><Link href={`/app/rides/${t.ride_id}`}>{t.pickup_summary} → {t.destination_summary}</Link><p>{t.awaiting_count ? `${t.awaiting_count} awaiting guardian receipt` : t.started_at ? "Trip in progress" : "Awaiting pickup"}{!!t.missing_recipient_count && ` · ${t.missing_recipient_count} receiving guardians needed`}{t.is_driver && " · You are the driver"}</p></div><Link className="button secondary" href={`/app/rides/${t.ride_id}#trip-progress`}>Review</Link></li>)}</ul></>}
      {trips.data.length>25 && <Link href={`/app/attention?after_trip=${trips.data[24].ride_id}`}>Next pickup and handoff items</Link>}{after && <Link href="/app/attention">First pickup and handoff items</Link>}
      {!!pending.length && <><h3>Ride invitations</h3><RideList offers={pending} statuses={statuses.data} /></>}
      {!!joined.length && <><h3>Driver and family replies</h3><RideList offers={joined} statuses={statuses.data} /></>}
      {!!driverReplies.length && <><h3>Your driver replies</h3><ul className="task-list">{driverReplies.map((p) => <li key={p.proposal_id}><span className="task-icon"><Icon name="car" /></span><div><Link href={`/app/rides/${p.ride_id}`}>{p.pickup_summary} → {p.destination_summary}</Link><p>{p.vehicle_label} · {p.rider_count} riders · {p.accepted_at ? "You accepted · Request pending" : "Your acceptance is needed"}</p></div><Link className="button secondary" href={`/app/rides/${p.ride_id}`}>Review</Link></li>)}</ul></>}
      {inbox.data.length>25 && <Link href="/app/driving?pending=1">See all pending driver requests</Link>}
      {!count && <EmptyState title="No items in this view">Open your schedule to review other weeks.</EmptyState>}
    </section>
    {!!upcoming.length && <><div className="section-head"><div><p className="eyebrow">A LITTLE PLANNING GOES A LONG WAY</p><h2>Coming up</h2></div><Link className="text-link" href="/app/schedule">View the week →</Link></div><RideList offers={upcoming} statuses={statuses.data} /></>}
  </>;
}
