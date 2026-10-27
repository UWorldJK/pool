import Link from "next/link";
import { createReadOnlyClient } from "@/lib/supabase/server";
import { rideTime } from "@/lib/rides";
import { DriverPanel } from "../driver-panel";
export default async function Driving() {
  const client = await createReadOnlyClient();
  const result = await client.rpc("driver_status",{});
  if (result.error) throw new Error("Driver requests could not be loaded");
  const own = result.data.filter((p) => p.is_driver);
  return <><h1>Your driving</h1><p>Proposals show only coarse route, times and necessary seat requirements. Exact private locations become available after confirmation. Refresh for current replies.</p><Link href="/app/vehicles">Manage your vehicles</Link>
    {own.length ? own.map((p) => <article key={p.proposal_id}><h2>{p.pickup_summary} → {p.destination_summary}</h2><p>Pickup: {rideTime(p.starts_at,p.timezone)}<br />Drop-off: {rideTime(p.ends_at,p.timezone)}</p><DriverPanel status={p} /></article>) : <p>No driver proposals yet.</p>}
  </>;
}
