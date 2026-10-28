// Database functions raise "POOL:<CODE>" (see supabase/migrations/*_write_functions.sql).
// Each code maps to one sentence a parent can act on.
const messages: Record<string, string> = {
  AUTH: "Your session ended. Sign in again to continue.",
  NO_FAMILY: "Set up your household first.",
  HAS_FAMILY: "You're already part of a household.",
  NAME_REQUIRED: "Add your name so other families know who you are.",
  BAD_TIMEZONE: "Choose a time zone from the list.",
  BAD_INPUT: "Something in the form isn't right. Check it and try again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that ride. It may have been removed.",
  NOT_MEMBER: "That person isn't on this team.",
  OWN_FAMILY: "Adults in a household can always drive their own children.",
  INVITE_INVALID: "This invite link has expired or was already used. Ask for a new one.",
  NO_RIDERS: "Choose at least one rider.",
  CHILD_NOT_ON_TEAM: "Every rider needs to be on this team.",
  IN_PAST: "Pick a time that hasn't passed yet.",
  SEATS_UNCONFIRMED: "Confirm you have enough seats and the right restraints.",
  SEATS: "Your car doesn't have enough passenger seats for this ride. Update your seats in Settings.",
  ALREADY_ASSIGNED: "Someone is already driving this ride.",
  ALREADY_DRIVER: "That person is already driving this ride.",
  REQUEST_OPEN: "A driver change for this ride is already waiting on replies.",
  REQUEST_CLOSED: "This request has already been answered.",
  EXPIRED: "The deadline for this request has passed.",
  TOO_LATE: "It's too close to the ride to ask for approvals. Contact the families directly.",
  NOT_REQUIRED: "Your family doesn't need to approve this request.",
  NOT_DRIVER: "Only the driver can do that.",
  RIDE_CLOSED: "This ride isn't open for that right now.",
  RIDE_STARTED: "This ride has already started.",
  TOO_EARLY: "Pickups open three hours before the ride.",
  BAD_STEP: "That step isn't available yet. Refresh to see the latest.",
};

const fallback = "Something went wrong. Try again in a moment.";

export function poolErrorCode(error: { message?: string } | null | undefined): string | null {
  const match = /^POOL:([A-Z_]+)/.exec(error?.message ?? "");
  return match ? match[1] : null;
}

export function poolErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const code = poolErrorCode(error);
  if (code) {
    return messages[code] ?? fallback;
  }
  // Postgres check constraint: a field was too long or out of range.
  if (error?.code === "23514") {
    return messages.BAD_INPUT;
  }
  return fallback;
}
