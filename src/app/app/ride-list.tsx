import { createReadOnlyClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Avatar, Icon, RouteSummary, StatusBadge } from "./presentation";
import { rideTime, type RideOffer } from "@/lib/rides";
import type { DriverStatus } from "@/lib/drivers";

export async function RideList({ offers, statuses = [] }: { offers: RideOffer[]; statuses?: DriverStatus[] }) {
  const unique = [...new Map(offers.map((offer) => [offer.id, offer])).values()];
  const client = await createReadOnlyClient();
  const ids = unique.map((ride) => ride.id);
  const [trips, handoffs] = await Promise.all([
    ids.length ? client.from("ride_trips").select("ride_id,completed_at").in("ride_id",ids) : { data:[],error:null },
    ids.length ? client.from("ride_handoffs").select("ride_id,status").in("ride_id",ids) : { data:[],error:null },
  ]);
  if (trips.error || handoffs.error) throw new Error("Trip progress could not be loaded");
  return <ul className="ride-list">{unique.map((ride) => {
    const status = statuses.find((item) => item.ride_id === ride.id);
    const trip = trips.data.find((item) => item.ride_id === ride.id);
    const awaiting = handoffs.data.filter((item) => item.ride_id === ride.id && item.status === "awaiting_handoff").length;
    const hiddenCoverage = !status && ride.status !== "joined";
    const label = ride.cancelled_at ? "Cancelled" : trip?.completed_at ? "Ride completed" : awaiting ? "Guardian receipt needed" : trip ? "Trip in progress" : hiddenCoverage ? "Private ride summary" : status?.coverage === "confirmed" ? "Driver confirmed" : status?.coverage === "awaiting_confirmation" ? "Driver not confirmed" : "Needs a driver";
    const tone = ride.cancelled_at || hiddenCoverage ? "neutral" : trip?.completed_at ? "positive" : awaiting || (!trip && status?.coverage !== "confirmed") ? "attention" : "positive";
    const day = new Date(ride.starts_at);
    const date = new Intl.DateTimeFormat("en", { day:"numeric",timeZone:ride.timezone }).format(day);
    const weekday = new Intl.DateTimeFormat("en", { weekday:"short",timeZone:ride.timezone }).format(day);
    const driver = !ride.cancelled_at && (status?.coverage === "confirmed" || trip?.completed_at) ? status?.current_driver_name || status?.driver_name : null;
    const pending = !ride.cancelled_at && status?.proposal_status === "pending";
    return <li key={ride.id}>
      <div className="ride-card-top"><div className="ride-date" aria-hidden="true"><span>{weekday}</span><strong>{date}</strong></div>
        <div><Link href={`/app/rides/${ride.id}`}>{ride.pickup_summary} → {ride.destination_summary}</Link><p>{ride.direction === "return" ? "Return" : "Outbound"} · Pickup: {rideTime(ride.starts_at, ride.timezone)}</p><p>Drop-off: {rideTime(ride.ends_at, ride.timezone)}</p></div>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>
      <RouteSummary pickup={ride.pickup_summary} destination={ride.destination_summary} />
      <div className="ride-card-note">
        {pending && <><p>{status.mode === "initial" ? "Driver proposal" : "Replacement review"}: {status.driver_name} · {status.accepted_at ? "Driver accepted" : "Driver reply needed"} · {status.rider_count-status.consent_count} child consents needed{status.mode !== "initial" && (status.coverage === "confirmed" ? " · Original driver remains assigned" : " · Uncovered until replacement confirms")}</p><p>Reply by {rideTime(status.deadline,status.timezone)}</p></>}
        {pending && status.coverage !== "confirmed" && <p>Uncovered until driver acceptance and every child’s consent.</p>}
        {!!awaiting && <p>{awaiting} awaiting explicit guardian receipt.</p>}
        {hiddenCoverage && <p>Join to view driver status.</p>}
        {offers.some((offer) => offer.id === ride.id && offer.status !== "joined") && <p>Your family: {[...new Set(offers.filter((offer) => offer.id === ride.id).map((offer) => offer.status))].join(", ")}</p>}
      </div>
      <div className="ride-card-bottom">{driver ? <><Avatar name={driver} /><span>{trip?.completed_at ? "Trip driver" : "Driver"}: {driver}</span></> : <><Icon name="car" /><span>{hiddenCoverage ? "Private driver details" : ride.cancelled_at ? "Ride cancelled" : "No confirmed driver"}</span></>}<Link className="button plain" href={`/app/rides/${ride.id}`}>View ride <span aria-hidden="true">→</span></Link></div>
    </li>;
  })}</ul>;
}
