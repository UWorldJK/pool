-- Read access is row-level security. The authenticated role can SELECT and
-- nothing else; writes go through security definer functions (ADR-001).
--
-- Policy helpers are security definer so a policy on team_members can ask about
-- team_members without recursing. They live in the private schema, which the
-- Data API does not expose.

grant usage on schema private to authenticated;

create function private.my_family()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_members where user_id = (select auth.uid())
$$;

create function private.is_family_adult(p_family uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = (select auth.uid())
  )
$$;

create function private.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team and user_id = (select auth.uid())
  )
$$;

create function private.is_team_organizer(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team and user_id = (select auth.uid()) and role = 'organizer'
  )
$$;

-- True when the caller and p_user are in the same household or share a team.
create function private.knows_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user = (select auth.uid())
    or exists (
      select 1
      from public.team_members a
      join public.team_members b on b.team_id = a.team_id
      where a.user_id = p_user and b.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.family_members a
      join public.family_members b on b.family_id = a.family_id
      where a.user_id = p_user and b.user_id = (select auth.uid())
    )
$$;

create function private.can_see_family(p_family uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.family_members fm
    join public.team_members theirs on theirs.user_id = fm.user_id
    join public.team_members mine on mine.team_id = theirs.team_id
    where fm.family_id = p_family and mine.user_id = (select auth.uid())
  )
$$;

create function private.can_see_child(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children c
    join public.family_members fm on fm.family_id = c.family_id
    where c.id = p_child and fm.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.team_children tc
    join public.team_members tm on tm.team_id = tc.team_id
    where tc.child_id = p_child and tm.user_id = (select auth.uid())
  )
$$;

create function private.ride_team(p_ride uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select team_id from public.rides where id = p_ride $$;

create function private.request_team(p_request uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.team_id
  from public.driver_requests dr
  join public.rides r on r.id = dr.ride_id
  where dr.id = p_request
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Supabase grants table privileges to anon and authenticated by default.
-- Replace them with read only access for signed in users.
revoke all on
  public.profiles, public.families, public.family_members, public.children,
  public.teams, public.team_members, public.team_children, public.invites,
  public.driver_approvals, public.rides, public.ride_riders, public.driver_requests,
  public.driver_request_approvals, public.activity_events, public.driver_requests_effective
from anon, authenticated;

grant select on
  public.profiles, public.families, public.family_members, public.children,
  public.teams, public.team_members, public.team_children, public.invites,
  public.driver_approvals, public.rides, public.ride_riders, public.driver_requests,
  public.driver_request_approvals, public.activity_events, public.driver_requests_effective
to authenticated;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_children enable row level security;
alter table public.invites enable row level security;
alter table public.driver_approvals enable row level security;
alter table public.rides enable row level security;
alter table public.ride_riders enable row level security;
alter table public.driver_requests enable row level security;
alter table public.driver_request_approvals enable row level security;
alter table public.activity_events enable row level security;

create policy "People you share a team or household with"
  on public.profiles for select to authenticated
  using ((select private.knows_user(id)));

create policy "Your household and families on your teams"
  on public.families for select to authenticated
  using ((select private.can_see_family(id)));

create policy "Adults of visible families"
  on public.family_members for select to authenticated
  using ((select private.can_see_family(family_id)));

create policy "Your children and children on your teams"
  on public.children for select to authenticated
  using ((select private.can_see_child(id)));

create policy "Teams you belong to"
  on public.teams for select to authenticated
  using ((select private.is_team_member(id)));

create policy "Members of your teams"
  on public.team_members for select to authenticated
  using ((select private.is_team_member(team_id)));

create policy "Rosters of your teams"
  on public.team_children for select to authenticated
  using ((select private.is_team_member(team_id)));

create policy "Invites you can manage"
  on public.invites for select to authenticated
  using (
    (kind = 'team' and (select private.is_team_organizer(team_id)))
    or (kind = 'family' and (select private.is_family_adult(family_id)))
  );

create policy "Approvals for visible children, or of you"
  on public.driver_approvals for select to authenticated
  using (driver_id = (select auth.uid()) or (select private.can_see_child(child_id)));

create policy "Rides of your teams"
  on public.rides for select to authenticated
  using ((select private.is_team_member(team_id)));

create policy "Riders on rides of your teams"
  on public.ride_riders for select to authenticated
  using ((select private.is_team_member(private.ride_team(ride_id))));

create policy "Driver requests on rides of your teams"
  on public.driver_requests for select to authenticated
  using ((select private.is_team_member(private.ride_team(ride_id))));

create policy "Request approvals on rides of your teams"
  on public.driver_request_approvals for select to authenticated
  using ((select private.is_team_member(private.request_team(request_id))));

create policy "Activity of your teams"
  on public.activity_events for select to authenticated
  using ((select private.is_team_member(team_id)));
