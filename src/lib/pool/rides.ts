// Pure ride logic shared by pages. The database enforces the rules; these
// helpers only describe state for the UI, so they never grant anything.
import type { Child, Family, RideWithDetails, Rider } from "./data";

export type Tone = "green" | "amber" | "muted";

export type RideState =
  | "cancelled"
  | "completed"
  | "in_progress"
  | "needs_driver"
  | "change_pending"
  | "driver_confirmed";

export function rideState(ride: Pick<RideWithDetails, "status" | "driver_id" | "request">): RideState {
  if (ride.status === "cancelled") return "cancelled";
  if (ride.status === "completed") return "completed";
  if (ride.status === "in_progress") return "in_progress";
  const pending = ride.request?.effectiveStatus === "pending";
  if (!ride.driver_id) return pending ? "change_pending" : "needs_driver";
  return pending ? "change_pending" : "driver_confirmed";
}

export function rideTag(ride: Pick<RideWithDetails, "status" | "driver_id" | "request">): { label: string; tone: Tone } {
  switch (rideState(ride)) {
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
    case "completed":
      return { label: "Ride complete", tone: "green" };
    case "in_progress":
      return { label: "On the way", tone: "green" };
    case "needs_driver":
      return { label: "Needs a driver", tone: "amber" };
    case "change_pending":
      return { label: ride.driver_id ? "Change pending" : "Driver pending", tone: "amber" };
    case "driver_confirmed":
      return { label: "Driver confirmed", tone: "green" };
  }
}

export type RiderStage = "waiting" | "picked_up" | "arrived" | "handed_off";

export function riderStage(rider: Pick<Rider, "picked_up_at" | "arrived_at" | "handed_off_at">): RiderStage {
  if (rider.handed_off_at) return "handed_off";
  if (rider.arrived_at) return "arrived";
  if (rider.picked_up_at) return "picked_up";
  return "waiting";
}

type TeamView = {
  children: Map<string, Child>;
  families: Map<string, Family>;
  approvals: Map<string, Set<string>>;
};

/**
 * Families that would be asked to approve `driverId` for this ride: those with
 * a rider whose family has not approved the driver and is not the driver's own.
 */
export function familiesToAsk(ride: Pick<RideWithDetails, "riders">, driverId: string, team: TeamView): string[] {
  const asked = new Set<string>();
  for (const rider of ride.riders) {
    const child = team.children.get(rider.child_id);
    if (!child) continue;
    const family = team.families.get(child.family_id);
    if (family?.adultIds.includes(driverId)) continue;
    if (team.approvals.get(child.id)?.has(driverId)) continue;
    asked.add(child.family_id);
  }
  return [...asked];
}

export function isMyChild(childId: string, familyId: string | null, team: TeamView): boolean {
  return !!familyId && team.children.get(childId)?.family_id === familyId;
}

export function involvesMe(ride: RideWithDetails, me: { id: string; familyId: string | null }, team: TeamView): boolean {
  return ride.driver_id === me.id || ride.riders.some((r) => isMyChild(r.child_id, me.familyId, team));
}

export type AttentionItem =
  | { kind: "handoff"; ride: RideWithDetails; childId: string }
  | { kind: "decide"; ride: RideWithDetails }
  | { kind: "respond"; ride: RideWithDetails }
  | { kind: "needs_driver"; ride: RideWithDetails };

/** v3's "Needs attention", in priority order. */
export function attentionItems(
  rides: RideWithDetails[],
  me: { id: string; familyId: string | null },
  team: TeamView,
  now: Date,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const weekAhead = now.getTime() + 7 * 24 * 60 * 60 * 1000;

  for (const ride of rides) {
    if (ride.status !== "in_progress") continue;
    for (const rider of ride.riders) {
      if (riderStage(rider) === "arrived" && isMyChild(rider.child_id, me.familyId, team)) {
        items.push({ kind: "handoff", ride, childId: rider.child_id });
      }
    }
  }
  for (const ride of rides) {
    const request = ride.request;
    if (!request || request.effectiveStatus !== "pending") continue;
    if (request.approvals.some((a) => a.family_id === me.familyId && a.decision === null)) {
      items.push({ kind: "decide", ride });
    }
  }
  for (const ride of rides) {
    const request = ride.request;
    if (request?.effectiveStatus === "pending" && request.proposed_driver === me.id && !request.driver_accepted_at) {
      items.push({ kind: "respond", ride });
    }
  }
  for (const ride of rides) {
    const starts = new Date(ride.starts_at).getTime();
    if (
      ride.status === "scheduled" &&
      !ride.driver_id &&
      // A pending request already shows as "decide" or "respond"; listing it again
      // would offer "Find a driver" on a ride that can't take another offer.
      ride.request?.effectiveStatus !== "pending" &&
      starts > now.getTime() &&
      starts <= weekAhead &&
      ride.riders.some((r) => isMyChild(r.child_id, me.familyId, team))
    ) {
      items.push({ kind: "needs_driver", ride });
    }
  }
  return items;
}

/** Joins names the way people say them: "Emma", "Emma and Lucas", "Emma, Lucas and Oliver". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "Sarah Chen" -> "Sarah" */
export function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

/** "Sarah Chen" -> "SC" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
