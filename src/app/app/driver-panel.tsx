import Link from "next/link";
import { rideTime } from "@/lib/rides";
import { coverageLabel, type DriverStatus } from "@/lib/drivers";
import { DriverForm, Confirmation } from "./driver-form";
export function DriverPanel({ status }: { status: DriverStatus }) {
  const fields = { proposal_id:status.proposal_id,revision:String(status.ride_revision) };
  const live = status.coverage === "awaiting_confirmation";
  return <section><h2>Driver and assignment</h2><p><strong>{status.cancelled_at ? "Cancelled ride" : coverageLabel(status.coverage)}</strong> · Proposal {status.proposal_status}</p>
    <p>{status.driver_name} · {status.vehicle_label} · Vehicle version {status.vehicle_version} · {status.passenger_seats} registered passenger seats</p>
    <p>{status.rider_count} riders · {status.booster_count} booster seats · {status.child_seat_count} child seats</p>
    <p>Driver acceptance: {status.accepted_at ? "Accepted" : "Required"} · Child consents: {status.consent_count} of {status.rider_count}</p>
    {status.accepted_at && <p>Driver attested: {status.available_seats} available passenger seats and accommodation of all required restraints. This is the driver’s statement.</p>}
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
    {status.is_driver && (status.coverage === "confirmed" || (live && status.accepted_at)) && <DriverForm command="withdrawDriver" fields={fields} label="Withdraw as driver"><Confirmation>I withdraw and leave this ride needing a driver.</Confirmation></DriverForm>}
    <Link href={`/app/rides/${status.ride_id}`}>Open ride details</Link>
  </section>;
}
