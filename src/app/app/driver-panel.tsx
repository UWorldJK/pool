import { createReadOnlyClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Disclosure, StatusBadge } from "./presentation";
import { rideTime } from "@/lib/rides";
import { coverageLabel, type DriverStatus } from "@/lib/drivers";
import { DriverForm, Confirmation } from "./driver-form";

export async function DriverPanel({ status, showLink = true }: { status: DriverStatus; showLink?: boolean }) {
  const client = await createReadOnlyClient();
  const trip = await client.from("ride_trips").select("completed_at").eq("ride_id",status.ride_id).maybeSingle();
  if (trip.error) throw new Error("Trip status could not be loaded");
  const completed = Boolean(trip.data?.completed_at || status.current_assignment_release_reason === "completed");
  const fields = { proposal_id:status.proposal_id,revision:String(status.ride_revision) };
  const live = status.proposal_status === "pending";
  const candidate = status.mode !== "initial" && status.proposal_status !== "confirmed";
  return <section className="panel driver-panel"><h2>Driver and assignment</h2>
    <p className="assignment-state"><StatusBadge tone={status.cancelled_at || completed ? "neutral" : status.coverage === "confirmed" ? "positive" : "attention"}><strong>{status.cancelled_at ? "Cancelled ride" : completed ? "Ride completed" : coverageLabel(status.coverage)}</strong></StatusBadge>{!completed && candidate && status.coverage === "confirmed" && <span>Current driver: {status.current_driver_name}</span>}</p>
    {status.mode !== "initial" && <><h3>{status.mode === "optional_swap" ? "Optional driver swap" : "Unavailable-driver replacement"}</h3><p>{completed ? `Trip completed with ${status.current_driver_name}. This replacement request is ${status.proposal_status}.` : status.coverage === "confirmed" && status.proposal_status !== "confirmed" ? `The original driver remains assigned. Replacement proposal ${status.proposal_status}.` : status.coverage !== "confirmed" ? "There is no confirmed driver. This ride stays uncovered until the driver accepts and every child has consent." : "Replacement confirmed."}</p></>}
    {!status.cancelled_at && !completed && status.mode === "initial" && status.coverage !== "confirmed" && <p>There is no confirmed driver. Acceptance and every child’s consent are required.</p>}
    <p className="driver-summary"><span className="eyebrow">{status.cancelled_at ? "Previous proposal" : completed && status.current_proposal_id === status.proposal_id ? "Trip driver" : candidate ? "Replacement candidate · " + status.proposal_status : status.proposal_status === "confirmed" ? "Confirmed driver" : "Driver proposal · " + status.proposal_status}</span><strong>{status.driver_name} · {status.vehicle_label}</strong><br />{status.passenger_seats} registered passenger seats</p>
    <p>Driver acceptance: {status.accepted_at ? "Accepted" : live ? "Required" : "Not accepted"} · Child consents: {status.consent_count} of {status.rider_count}</p>
    {live && <p>Reply by {rideTime(status.deadline,status.timezone)}</p>}
    {(!live || !status.is_driver) && <Disclosure title="Capacity and proposal details"><p>Proposal {status.proposal_status} · Vehicle version {status.vehicle_version} · Ride revision {status.ride_revision}</p><p>{status.rider_count} riders · {status.booster_count} booster seats · {status.child_seat_count} child seats</p>{status.accepted_at && <p>Driver attested: {status.available_seats} available passenger seats and all required restraints.</p>}<p>Proposal deadline: {rideTime(status.deadline,status.timezone)}</p></Disclosure>}
    {status.cancelled_at && <p>This ride was cancelled for everyone.</p>}
    {status.is_driver && live && <div id={`driver-reply-${status.ride_id}`}><Disclosure title="Your driver reply" open={!status.accepted_at}>
      <p>{status.rider_count} riders · {status.booster_count} booster seats · {status.child_seat_count} child seats</p>
      <p>Vehicle version {status.vehicle_version} · Ride revision {status.ride_revision}. Acceptance is separate from consent for your own children.</p>
      {status.accepted_at && <p>You reported {status.available_seats} available passenger seats and all required restraints.</p>}
      <DriverForm command="acceptDriverProposal" fields={fields} label={status.accepted_at ? "Retry driver acceptance" : "Accept as driver"}>
        <label>Available passenger seats, excluding you<input name="available_seats" type="number" min={status.rider_count} max={status.passenger_seats} step={1} defaultValue={status.available_seats ?? status.passenger_seats} required /></label>
        <label className="checkbox-label"><input name="restraints" type="checkbox" value="yes" required />I can accommodate all {status.booster_count} booster seats and {status.child_seat_count} child seats required for these riders.</label>
        <Confirmation>I explicitly accept driving this ride with this vehicle and available passenger capacity.</Confirmation>
      </DriverForm>
      <DriverForm command="declineDriverProposal" fields={fields} label="Decline driving" />
    </Disclosure></div>}
    {!trip.data && (status.is_current_driver || (status.is_driver && live && status.accepted_at)) && <Disclosure title={status.is_current_driver ? "Withdraw as driver" : "Withdraw proposed driving"}><DriverForm command="withdrawDriver" fields={status.is_current_driver ? { proposal_id:status.current_proposal_id,revision:String(status.current_proposal_revision) } : fields} label={status.is_current_driver ? "Withdraw as driver" : "Withdraw proposed driving"}><Confirmation>{status.is_current_driver || status.mode === "initial" ? "I withdraw and leave this ride needing a driver." : "I withdraw this candidate response. An available original driver stays assigned."}</Confirmation></DriverForm></Disclosure>}
    {showLink && <Link className="text-link" href={`/app/rides/${status.ride_id}`}>Open ride details <span aria-hidden="true">›</span></Link>}
  </section>;
}
