import Link from "next/link";
import { rideTime, type RideOffer } from "@/lib/rides";
export function RideList({ offers }: { offers: RideOffer[] }) {
  const unique = [...new Map(offers.map((offer) => [offer.id, offer])).values()];
  return <ul>{unique.map((ride) => <li key={ride.id}>
    <Link href={`/app/rides/${ride.id}`}>{ride.pickup_summary} → {ride.destination_summary}</Link>
    <p>{ride.direction === "return" ? "Return" : "Outbound"} · {ride.cancelled_at ? "Cancelled" : "Unassigned — needs a driver"}</p>
    <p>Pickup: {rideTime(ride.starts_at, ride.timezone)}<br />Drop-off: {rideTime(ride.ends_at, ride.timezone)}<br />{ride.timezone}</p>
    <p>Your family responses: {[...new Set(offers.filter((o) => o.id === ride.id).map((o) => o.status))].join(", ")}</p>
  </li>)}</ul>;
}
