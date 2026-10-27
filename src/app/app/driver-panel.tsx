import { createReadOnlyClient } from "@/lib/supabase/server";
import Link from "next/link";
import { rideTime } from "@/lib/rides";
import { coverageLabel, type DriverStatus } from "@/lib/drivers";
import { DriverForm, Confirmation } from "./driver-form";
export async function DriverPanel({ status }: { status: DriverStatus }) {
  const client = await createReadOnlyClient();
  const trip = await client.from("ride_trips").select("completed_at").eq("ride_id",status.ride_id).maybeSingle();
  if (trip.error) throw new Error("Trip status could not be loaded");
  const fields = { proposal_id:status.proposal_id,revision:String(status.ride_revision) };
  const live = status.proposal_status === "pending";
  return <section><h2>Driver and assignment</h2><p><strong>{status.cancelled_at ? "Cancelled ride" : trip.data?.completed_at ? "Ride completed" : coverageLabel(status.coverage)}</strong> · Proposal {status.proposal_status}</p>
    {status.mode !== "initial" && <><h3>{status.mode === "optional_swap" ? "Optional driver swap" : "Unavailable-driver replacement"}</h3><p>{status.coverage === "confirmed" && status.proposal_status !== "confirmed" ? `Current driver: ${status.current_driver_name}. This replacement request is ${status.proposal_status}; the original assignment remains in place.` : status.coverage !== "confirmed" ? "There is no confirmed driver. Missing replies, decline, cancellation or expiry leave this ride uncovered." : "Replacement confirmed."}</p></>}
    <p>{status.driver_name} · {status.vehicle_label} · Vehicle version {status.vehicle_version} · {status.passenger_seats} registered passenger seats</p>
    <p>{status.rider_count} riders · {status.booster_count} booster seats · {status.child_seat_count} child seats</p>
    <p>Driver acceptance: {status.accepted_at ? "Accepted" : "Required"} · Child consents: {status.consent_count} of {status.rider_count}</p>
    {status.accepted_at && <p>Driver attested: {status.available_seats} available passenger seats and accommodation of all required restraints. This is the driver’s statement.</p>}
    {live && <p>Outstanding replies: {status.accepted_at ? "driver accepted" : "driver acceptance required"}; {status.rider_count-status.consent_count} child consents required. Each guardian can respond only for their own children.</p>}
    <p>Reply deadline: {rideTime(status.deadline,status.timezone)}</p>
    {!status.cancelled_at && status.coverage === "needs_driver" && <p>This proposal provides no coverage. A participating guardian must nominate a driver again with fresh consent.</p>}
    {status.cancelled_at && <p>This ride was cancelled for everyone and cannot be reopened. Reservations have been released.</p>}
    {status.is_driver && live && <>
      <h3>Your driver reply</h3>
      <p>Driver acceptance is separate from guardian consent, including for your own children.</p>
      <DriverForm command="acceptDriverProposal" fields={fields} label={status.accepted_at ? "Retry driver acceptance" : "Accept as driver"}>
        <label>Available passenger seats, excluding you<input name="available_seats" type="number" min={status.rider_count} max={status.passenger_seats} step={1} defaultValue={status.available_seats ?? status.passenger_seats} required /></label>
        <label className="checkbox-label"><input name="restraints" type="checkbox" value="yes" required />I can accommodate all {status.booster_count} booster seats and {status.child_seat_count} child seats required for these riders.</label>
        <Confirmation>I explicitly accept driving this ride with this vehicle and available passenger capacity.</Confirmation>
      </DriverForm>
      <DriverForm command="declineDriverProposal" fields={fields} label="Decline driving" />
    </>}
    {!trip.data && (status.is_current_driver || (status.is_driver && live && status.accepted_at)) && <DriverForm command="withdrawDriver" fields={status.is_current_driver ? { proposal_id:status.current_proposal_id,revision:String(status.current_proposal_revision) } : fields} label={status.is_current_driver ? "Withdraw as driver" : "Withdraw proposed driving"}><Confirmation>{status.is_current_driver || status.mode === "initial" ? "I withdraw and leave this ride needing a driver." : "I withdraw this candidate response. An available original driver stays assigned."}</Confirmation></DriverForm>}
    <Link href={`/app/rides/${status.ride_id}`}>Open ride details</Link>
  </section>;
}
