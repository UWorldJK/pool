"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, requireUser } from "@/lib/pool/data";
import { poolErrorMessage } from "@/lib/pool/errors";
import { checked, integer, inviteToken, text, uuid, uuids } from "@/lib/pool/form";
import { safeNextPath } from "@/lib/pool/paths";
import { isValidLocalDateTime } from "@/lib/pool/time";
import type { ActionResult } from "@/lib/pool/action-result";

// Every action re-checks the session; Server Actions are reachable by direct POST.
// Authorization itself happens in the database functions (ADR-001).

const NEXT_COOKIE = "pool-next";

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function refreshTeam(teamId: string | null) {
  if (teamId) revalidatePath(`/t/${teamId}`, "layout");
}

// Auth -------------------------------------------------------------------------

export async function sendMagicLink(_: ActionResult, form: FormData): Promise<ActionResult> {
  const email = text(form, "email", 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Enter an email address like name@example.com.");
  }
  const { supabase } = await getSession();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.code);
    return fail(
      error.status === 429
        ? "Too many sign in emails were sent. Wait a few minutes and try again."
        : "We couldn't send the email. Try again in a moment.",
    );
  }
  // The link may open on another device, so this is a convenience, not a requirement.
  (await cookies()).set(NEXT_COOKIE, safeNextPath(text(form, "next", 300)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return { ok: true, message: email };
}

export async function signOut() {
  const { supabase } = await getSession();
  await supabase.auth.signOut();
  redirect("/");
}

// Onboarding --------------------------------------------------------------------

export async function saveProfile(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("update_profile", {
    p_display_name: text(form, "name", 80),
    p_phone: text(form, "phone", 30),
    p_vehicle: text(form, "vehicle", 80),
    p_plate_last3: text(form, "plate", 4).replace(/[^A-Za-z0-9]/g, ""),
    p_seats: integer(form, "seats", 0, 8, 0),
  });
  if (error) return fail(poolErrorMessage(error));
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function createHousehold(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const name = text(form, "family", 60);
  const children = form
    .getAll("child")
    .map((value) => String(value).trim().slice(0, 40))
    .filter(Boolean);
  if (!name) return fail("Add your family name, like Morgan.");
  if (children.length === 0) return fail("Add at least one child.");

  const { error } = await supabase.rpc("create_family", { p_name: name });
  if (error) return fail(poolErrorMessage(error));
  for (const child of children) {
    const { error: childError } = await supabase.rpc("add_child", { p_first_name: child, p_last_name: name });
    if (childError) return fail(poolErrorMessage(childError));
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Household saved." };
}

export async function addChild(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const first = text(form, "first", 40);
  if (!first) return fail("Add your child's first name.");
  const { error } = await supabase.rpc("add_child", { p_first_name: first, p_last_name: text(form, "last", 40) });
  if (error) return fail(poolErrorMessage(error));
  revalidatePath("/", "layout");
  return { ok: true, message: `${first} was added.` };
}

export async function createTeam(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const name = text(form, "name", 60);
  if (!name) return fail("Add a team name.");
  const { data: teamId, error } = await supabase.rpc("create_team", {
    p_name: name,
    p_detail: text(form, "detail", 80),
    p_timezone: text(form, "timezone", 60) || "America/Denver",
  });
  if (error || !teamId) return fail(poolErrorMessage(error));
  const children = uuids(form, "child");
  if (children.length) {
    const { error: rosterError } = await supabase.rpc("set_team_children", { p_team: teamId, p_child_ids: children });
    if (rosterError) return fail(poolErrorMessage(rosterError));
  }
  revalidatePath("/", "layout");
  redirect(`/t/${teamId}`);
}

export async function acceptInvite(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const token = inviteToken(text(form, "token", 300));
  if (!token) return fail("Paste the whole invite link you were sent.");
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) return fail(poolErrorMessage(error));
  const result = data as { kind: string; id: string };
  revalidatePath("/", "layout");
  redirect(result.kind === "team" ? `/t/${result.id}/riders` : "/welcome");
}

export async function setTeamChildren(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const teamId = uuid(form, "team");
  if (!teamId) return fail(poolErrorMessage(null));
  const { error } = await supabase.rpc("set_team_children", { p_team: teamId, p_child_ids: uuids(form, "child") });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(teamId);
  if (checked(form, "continue")) redirect(`/t/${teamId}`);
  return { ok: true, message: "Riders updated." };
}

export async function createInvite(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const kind = form.get("kind") === "family" ? "family" : "team";
  const target = uuid(form, "target");
  if (!target) return fail(poolErrorMessage(null));
  const { data, error } = await supabase.rpc("create_invite", { p_kind: kind, p_target: target });
  if (error || !data) return fail(poolErrorMessage(error));
  return { ok: true, message: "Link ready. It works for 7 days.", data: `/invite/${data}` };
}

// Approvals ----------------------------------------------------------------------

export async function setDriverApproval(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const child = uuid(form, "child");
  const driver = uuid(form, "driver");
  if (!child || !driver) return fail(poolErrorMessage(null));
  const approve = form.get("approve") === "true";
  const { error } = await supabase.rpc("set_driver_approval", { p_child: child, p_driver: driver, p_approved: approve });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(uuid(form, "team"));
  return { ok: true, message: approve ? "Approved." : "Approval removed." };
}

// Rides ----------------------------------------------------------------------------

export async function planRide(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const teamId = uuid(form, "team");
  const start = text(form, "start", 16);
  const title = text(form, "title", 60);
  const pickup = text(form, "pickup", 100);
  const dropoff = text(form, "dropoff", 100);
  const drive = form.get("driver") === "me";
  if (!teamId) return fail(poolErrorMessage(null));
  if (!title || !pickup || !dropoff) return fail("Add a name, pickup point and drop-off.");
  if (!isValidLocalDateTime(start)) return fail("Choose a day and pickup time.");
  const { error } = await supabase.rpc("create_rides", {
    p_team: teamId,
    p_title: title,
    p_local_start: `${start}:00`,
    p_pickup: pickup,
    p_dropoff: dropoff,
    p_child_ids: uuids(form, "child"),
    p_weeks: integer(form, "weeks", 1, 12, 1),
    p_drive: drive,
    p_seats_confirmed: checked(form, "seats"),
  });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(teamId);
  return { ok: true, message: drive ? "Ride saved. You're driving." : "Ride saved. It still needs a driver." };
}

type RideCall =
  | "claim_ride"
  | "release_ride"
  | "cancel_ride"
  | "skip_ride"
  | "mark_picked_up"
  | "mark_arrived"
  | "confirm_handoff";

const rideMessages: Record<RideCall, string> = {
  claim_ride: "",
  release_ride: "You're off this ride. It now needs a driver.",
  cancel_ride: "Ride cancelled.",
  skip_ride: "Taken off this ride.",
  mark_picked_up: "Pickup confirmed.",
  mark_arrived: "Arrival reported. The family will confirm the handoff.",
  confirm_handoff: "Handoff confirmed.",
};

async function rideCall(call: RideCall, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const ride = uuid(form, "ride");
  const child = uuid(form, "child");
  if (!ride) return fail(poolErrorMessage(null));

  let result;
  switch (call) {
    case "claim_ride":
      result = await supabase.rpc("claim_ride", { p_ride: ride, p_seats_confirmed: checked(form, "seats") });
      break;
    case "skip_ride":
    case "mark_picked_up":
    case "mark_arrived":
    case "confirm_handoff":
      if (!child) return fail(poolErrorMessage(null));
      result = await supabase.rpc(call, { p_ride: ride, p_child: child });
      break;
    default:
      result = await supabase.rpc(call, { p_ride: ride });
  }
  if (result.error) return fail(poolErrorMessage(result.error));
  refreshTeam(uuid(form, "team"));
  if (call === "claim_ride") {
    return {
      ok: true,
      message:
        result.data === "assigned"
          ? "You're driving. Every family had already approved you."
          : "Offer sent. You'll be assigned once the other families approve.",
    };
  }
  return { ok: true, message: rideMessages[call] };
}

export async function claimRide(_: ActionResult, form: FormData) {
  return rideCall("claim_ride", form);
}
export async function releaseRide(_: ActionResult, form: FormData) {
  return rideCall("release_ride", form);
}
export async function cancelRide(_: ActionResult, form: FormData) {
  return rideCall("cancel_ride", form);
}
export async function skipRide(_: ActionResult, form: FormData) {
  return rideCall("skip_ride", form);
}
export async function markPickedUp(_: ActionResult, form: FormData) {
  return rideCall("mark_picked_up", form);
}
export async function markArrived(_: ActionResult, form: FormData) {
  return rideCall("mark_arrived", form);
}
export async function confirmHandoff(_: ActionResult, form: FormData): Promise<ActionResult> {
  if (!checked(form, "confirm")) return fail("Confirm your child is with you before completing the handoff.");
  return rideCall("confirm_handoff", form);
}

export async function proposeDriver(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const ride = uuid(form, "ride");
  const driver = uuid(form, "driver");
  if (!ride) return fail(poolErrorMessage(null));
  if (!driver) return fail("Choose who you'd like to ask.");
  const { error } = await supabase.rpc("propose_driver", { p_ride: ride, p_driver: driver });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(uuid(form, "team"));
  return { ok: true, message: "Request sent. Nothing changes until they accept and every family approves." };
}

export async function respondToRequest(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const request = uuid(form, "request");
  if (!request) return fail(poolErrorMessage(null));
  const accept = form.get("answer") === "accept";
  const { data, error } = await supabase.rpc("respond_to_request", {
    p_request: request,
    p_accept: accept,
    p_seats_confirmed: checked(form, "seats"),
  });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(uuid(form, "team"));
  if (!accept) return { ok: true, message: "You declined. The plan didn't change." };
  return {
    ok: true,
    message: data === "confirmed" ? "You're confirmed for this ride." : "Accepted. Waiting for the other families.",
  };
}

export async function decideRequest(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const request = uuid(form, "request");
  if (!request) return fail(poolErrorMessage(null));
  const approve = form.get("answer") === "approve";
  const { data, error } = await supabase.rpc("decide_request", { p_request: request, p_approve: approve });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(uuid(form, "team"));
  if (!approve) return { ok: true, message: "You declined. The plan didn't change." };
  return {
    ok: true,
    message: data === "confirmed" ? "Approved. The new driver is confirmed." : "Approved for your family. Waiting on the others.",
  };
}

export async function cancelRequest(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const request = uuid(form, "request");
  if (!request) return fail(poolErrorMessage(null));
  const { error } = await supabase.rpc("cancel_request", { p_request: request });
  if (error) return fail(poolErrorMessage(error));
  refreshTeam(uuid(form, "team"));
  return { ok: true, message: "Request cancelled. The plan didn't change." };
}

// Preferences ------------------------------------------------------------------------

export async function setTheme(form: FormData) {
  const value = String(form.get("theme"));
  const theme = value === "dark" || value === "light" ? value : "system";
  (await cookies()).set("pool-theme", theme, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}
