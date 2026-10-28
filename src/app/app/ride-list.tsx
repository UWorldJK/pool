import { createReadOnlyClient } from "@/lib/supabase/server";
import Link from "next/link";
import { RouteSummary, StatusBadge } from "./presentation";
import { rideTime, type RideOffer } from "@/lib/rides";
import { coverageLabel, type DriverStatus } from "@/lib/drivers";

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
    const label = ride.cancelled_at ? "Cancelled" : trip?.completed_at ? "Ride completed" : awaiting ? "Guardian receipt needed" : trip ? "Trip in progress" : hiddenCoverage ? "Private ride summary" : status?.coverage === "confirmed" ? "Driver confirmed" : status?.coverage === "awaiting_confirmation" ? "Replies needed" : "Needs a driver";
    const tone = ride.cancelled_at || hiddenCoverage ? "neutral" : trip?.completed_at ? "positive" : awaiting || (!trip && status?.coverage !== "confirmed") ? "attention" : "positive";
    return <li key={ride.id}>
      <div className="ride-card-top"><Link href={`/app/rides/${ride.id}`}>{ride.pickup_summary} → {ride.destination_summary}</Link><StatusBadge tone={tone}>{label}</StatusBadge></div>
      <RouteSummary pickup={ride.pickup_summary} destination={ride.destination_summary} />
      <p>{ride.direction === "return" ? "Return" : "Outbound"} · {ride.cancelled_at ? "Cancelled" : hiddenCoverage ? "Join to view driver status" : coverageLabel(status?.coverage)}</p>
      {status?.mode !== "initial" && status?.proposal_status === "pending" && <p className="notice">Replacement review pending · {status.coverage === "confirmed" ? "Original driver remains assigned" : "Uncovered until replacement confirms"} · {status.accepted_at ? "Driver accepted" : "Driver reply required"} · {status.rider_count-status.consent_count} child consents outstanding · Deadline: {rideTime(status.deadline,status.timezone)}</p>}
      {trip && <p>Manually reported: {trip.completed_at ? "Ride completed" : "Trip in progress — handoffs remain"}</p>}
      {!!awaiting && <p>{awaiting} awaiting explicit guardian receipt.</p>}
      <div className="ride-meta"><p>Pickup: {rideTime(ride.starts_at, ride.timezone)}<br />Drop-off: {rideTime(ride.ends_at, ride.timezone)}<br />{ride.timezone}</p><p>Your family responses: {[...new Set(offers.filter((offer) => offer.id === ride.id).map((offer) => offer.status))].join(", ")}</p></div>
    </li>;
  })}</ul>;
}
