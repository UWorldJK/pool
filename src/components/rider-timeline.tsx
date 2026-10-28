import type { RideWithDetails, TeamData } from "@/lib/pool/data";
import { firstName, isMyChild, riderStage } from "@/lib/pool/rides";
import { formatTime } from "@/lib/pool/time";
import { Icon } from "./icon";
import { HandoffDialog, StepButton } from "./ride-actions";

/**
 * Each rider's progress with the step the viewer may take: the driver marks
 * pickup and arrival, the child's family confirms the handoff or skips the ride.
 * The database enforces the same rules; this only hides buttons that would fail.
 */
export function RiderTimeline({
  ride,
  team,
  me,
}: {
  ride: RideWithDetails;
  team: TeamData;
  me: { id: string; familyId: string | null };
}) {
  const zone = team.team.timezone;
  const ids = { teamId: team.team.id, rideId: ride.id };
  const open = ride.status === "scheduled" || ride.status === "in_progress";
  const isDriver = ride.driver_id === me.id;
  const driverName = ride.driver_id ? firstName(team.people.get(ride.driver_id)?.name ?? "The driver") : "The driver";
  const at = (value: string | null) => (value ? formatTime(new Date(value), zone) : "");

  return (
    <ol className="trip-timeline">
      {ride.riders.map((rider) => {
        const child = team.children.get(rider.child_id);
        const name = child?.first_name ?? "A rider";
        const family = child ? team.families.get(child.family_id) : null;
        const stage = riderStage(rider);
        const mine = isMyChild(rider.child_id, me.familyId, team);
        return (
          <li key={rider.child_id}>
            <span className={`dot ${stage === "arrived" ? "amber" : stage === "waiting" ? "open" : ""}`}>
              {stage === "waiting" ? null : <Icon name={stage === "arrived" ? "home" : "check"} size={15} />}
            </span>
            <div>
              <strong>
                {name}
                <span className="muted"> · {mine ? "yours" : family ? `${family.name} family` : "another family"}</span>
              </strong>
              <p>
                {stage === "waiting" && "Waiting for pickup"}
                {stage === "picked_up" && `Picked up at ${at(rider.picked_up_at)}`}
                {stage === "arrived" && `Arrived at ${at(rider.arrived_at)} · waiting for the family to confirm`}
                {stage === "handed_off" && `With family since ${at(rider.handed_off_at)}`}
              </p>
              <div className="step-actions">
                {open && isDriver && stage === "waiting" ? <StepButton ids={ids} childId={rider.child_id} step="pickup" childName={name} /> : null}
                {open && isDriver && stage === "picked_up" ? <StepButton ids={ids} childId={rider.child_id} step="arrived" childName={name} /> : null}
                {mine && stage === "arrived" ? (
                  <HandoffDialog ids={ids} childId={rider.child_id} childName={name} driverName={driverName} />
                ) : null}
                {open && mine && stage === "waiting" ? <StepButton ids={ids} childId={rider.child_id} step="skip" childName={name} /> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
