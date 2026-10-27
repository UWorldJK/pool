import { createReadOnlyClient } from "@/lib/supabase/server";
import Link from "next/link";
import { rideTime, type RideOffer } from "@/lib/rides";
import { coverageLabel, type DriverStatus } from "@/lib/drivers";
export async function RideList({ offers, statuses = [] }: { offers: RideOffer[]; statuses?: DriverStatus[] }) {
  const unique = [...new Map(offers.map((offer) => [offer.id, offer])).values()];
  const client = await createReadOnlyClient();
  const trips = unique.length ? await client.from("ride_trips").select("ride_id,completed_at").in("ride_id",unique.map((r) => r.id)) : { data:[],error:null };
  if (trips.error) throw new Error("Trip progress could not be loaded");
  return <ul>{unique.map((ride) => <li key={ride.id}>
    <Link href={`/app/rides/${ride.id}`}>{ride.pickup_summary} → {ride.destination_summary}</Link>
    <p>{ride.direction === "return" ? "Return" : "Outbound"} · {ride.cancelled_at ? "Cancelled" : coverageLabel(statuses.find((p) => p.ride_id === ride.id)?.coverage)}</p>
    {trips.data.some((t) => t.ride_id===ride.id) && <p>Manually reported: {trips.data.find((t) => t.ride_id===ride.id)?.completed_at ? "Ride completed" : "Trip in progress — handoffs remain"}</p>}
    <p>Pickup: {rideTime(ride.starts_at, ride.timezone)}<br />Drop-off: {rideTime(ride.ends_at, ride.timezone)}<br />{ride.timezone}</p>
    <p>Your family responses: {[...new Set(offers.filter((o) => o.id === ride.id).map((o) => o.status))].join(", ")}</p>
  </li>)}</ul>;
}
