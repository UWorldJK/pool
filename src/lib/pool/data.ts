import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type Child = Tables<"children">;
export type Ride = Tables<"rides">;
export type Rider = Tables<"ride_riders">;
export type DriverRequest = Tables<"driver_requests">;
export type RequestApproval = Tables<"driver_request_approvals">;
export type ActivityEvent = Tables<"activity_events">;

// One Supabase client and one validated user per request.
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export async function requireUser() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }
  return { supabase: session.supabase, user: session.user };
}

export type Household = {
  id: string;
  name: string;
  adults: { id: string; name: string }[];
  children: Child[];
};

export type Me = {
  id: string;
  email: string;
  profile: Profile | null;
  household: Household | null;
  teams: { id: string; name: string; detail: string; role: string }[];
};

export const getMe = cache(async (): Promise<Me> => {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: membership }, { data: teams }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("family_members").select("family_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("team_members").select("role, teams(id, name, detail)").eq("user_id", user.id),
  ]);

  let household: Household | null = null;
  if (membership) {
    const [{ data: family }, { data: adults }, { data: children }] = await Promise.all([
      supabase.from("families").select("id, name").eq("id", membership.family_id).single(),
      supabase.from("family_members").select("user_id").eq("family_id", membership.family_id),
      supabase.from("children").select("*").eq("family_id", membership.family_id).order("created_at"),
    ]);
    const adultIds = (adults ?? []).map((a) => a.user_id);
    const { data: adultProfiles } = await supabase.from("profiles").select("id, display_name").in("id", adultIds);
    if (family) {
      household = {
        id: family.id,
        name: family.name,
        adults: adultIds.map((id) => ({
          id,
          name: adultProfiles?.find((p) => p.id === id)?.display_name || "Invited adult",
        })),
        children: children ?? [],
      };
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    profile: profile ?? null,
    household,
    teams: (teams ?? [])
      .filter((t) => t.teams)
      .map((t) => ({ id: t.teams!.id, name: t.teams!.name, detail: t.teams!.detail, role: t.role })),
  };
});

/** Where a signed in person should land: the next onboarding step or their team. */
export function nextStep(me: Me): string {
  if (!me.profile?.display_name) return "/welcome";
  if (!me.household) return "/welcome";
  if (me.teams.length === 0) return "/welcome";
  return `/t/${me.teams[0].id}`;
}

export type Person = {
  id: string;
  name: string;
  phone: string | null;
  vehicle: string | null;
  plateLast3: string | null;
  seats: number;
  role: string;
  familyId: string | null;
};

export type Family = { id: string; name: string; adultIds: string[] };

export type TeamData = {
  team: Tables<"teams">;
  role: string;
  people: Map<string, Person>;
  families: Map<string, Family>;
  children: Map<string, Child>;
  /** childId -> driver ids with an active standing approval */
  approvals: Map<string, Set<string>>;
};

export const getTeam = cache(async (teamId: string): Promise<TeamData> => {
  const { supabase, user } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) notFound();

  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (!team) notFound();

  const [{ data: members }, { data: roster }] = await Promise.all([
    supabase.from("team_members").select("user_id, role").eq("team_id", teamId),
    supabase.from("team_children").select("child_id").eq("team_id", teamId),
  ]);
  const memberIds = (members ?? []).map((m) => m.user_id);
  const childIds = (roster ?? []).map((r) => r.child_id);

  const [{ data: profiles }, { data: familyLinks }, { data: children }, { data: approvals }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", memberIds),
    supabase.from("family_members").select("family_id, user_id").in("user_id", memberIds),
    supabase.from("children").select("*").in("id", childIds),
    supabase.from("driver_approvals").select("child_id, driver_id").in("child_id", childIds).is("revoked_at", null),
  ]);

  const familyIds = [...new Set([...(familyLinks ?? []).map((f) => f.family_id), ...(children ?? []).map((c) => c.family_id)])];
  const [{ data: familyRows }, { data: allAdults }] = await Promise.all([
    supabase.from("families").select("id, name").in("id", familyIds),
    supabase.from("family_members").select("family_id, user_id").in("family_id", familyIds),
  ]);

  const familyOf = new Map((familyLinks ?? []).map((f) => [f.user_id, f.family_id]));
  const people = new Map<string, Person>();
  for (const member of members ?? []) {
    const p = profiles?.find((row) => row.id === member.user_id);
    people.set(member.user_id, {
      id: member.user_id,
      name: p?.display_name || "New member",
      phone: p?.phone ?? null,
      vehicle: p?.vehicle ?? null,
      plateLast3: p?.plate_last3 ?? null,
      seats: p?.seats ?? 0,
      role: member.role,
      familyId: familyOf.get(member.user_id) ?? null,
    });
  }

  const families = new Map<string, Family>();
  for (const f of familyRows ?? []) {
    families.set(f.id, {
      id: f.id,
      name: f.name,
      adultIds: (allAdults ?? []).filter((a) => a.family_id === f.id).map((a) => a.user_id),
    });
  }

  const approvalMap = new Map<string, Set<string>>();
  for (const a of approvals ?? []) {
    if (!approvalMap.has(a.child_id)) approvalMap.set(a.child_id, new Set());
    approvalMap.get(a.child_id)!.add(a.driver_id);
  }

  return {
    team,
    role: members?.find((m) => m.user_id === user.id)?.role ?? "member",
    people,
    families,
    children: new Map((children ?? []).map((c) => [c.id, c])),
    approvals: approvalMap,
  };
});

export type RideWithDetails = Ride & {
  riders: Rider[];
  request: (DriverRequest & { approvals: RequestApproval[]; effectiveStatus: string }) | null;
};

/** Rides that start in [fromIso, toIso), with riders and any open driver request. */
export const getRides = cache(async (teamId: string, fromIso: string, toIso: string): Promise<RideWithDetails[]> => {
  const { supabase } = await requireUser();
  const { data: rides } = await supabase
    .from("rides")
    .select("*, ride_riders(*)")
    .eq("team_id", teamId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at");
  return attachRequests(rides ?? []);
});

/** The window the shell and Today use: yesterday through eight days ahead, by the hour. */
export function attentionWindow(now: Date): [string, string] {
  const hour = 60 * 60 * 1000;
  const start = Math.floor(now.getTime() / hour) * hour;
  return [new Date(start - 24 * hour).toISOString(), new Date(start + 8 * 24 * hour).toISOString()];
}

export async function getRide(teamId: string, rideId: string): Promise<RideWithDetails> {
  const { supabase } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(rideId)) notFound();
  const { data: ride } = await supabase
    .from("rides")
    .select("*, ride_riders(*)")
    .eq("team_id", teamId)
    .eq("id", rideId)
    .maybeSingle();
  if (!ride) notFound();
  const [withRequest] = await attachRequests([ride]);
  return withRequest;
}

async function attachRequests(rides: (Ride & { ride_riders: Rider[] })[]): Promise<RideWithDetails[]> {
  if (rides.length === 0) return [];
  const { supabase } = await requireUser();
  const { data: requests } = await supabase
    .from("driver_requests")
    .select("*, driver_request_approvals(*)")
    .in("ride_id", rides.map((r) => r.id))
    .in("status", ["pending", "expired"])
    .order("created_at", { ascending: false });
  const now = Date.now();
  return rides.map(({ ride_riders, ...ride }) => {
    // Newest first, so this is the latest open or missed request for the ride.
    const open = requests?.find((r) => r.ride_id === ride.id);
    return {
      ...ride,
      riders: ride_riders,
      request: open
        ? {
            ...open,
            approvals: open.driver_request_approvals,
            effectiveStatus: open.status === "expired" || new Date(open.expires_at).getTime() <= now ? "expired" : "pending",
          }
        : null,
    };
  });
}

export async function getActivity(teamId: string, limit = 50): Promise<ActivityEvent[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("activity_events")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    // Events from one transaction share a timestamp; the identity keeps their order.
    .order("id", { ascending: false })
    .limit(limit);
  return data ?? [];
}
