-- Every write in the app is one of the public functions below (ADR-001).
-- Each runs as the table owner, so each one checks the caller itself.
-- Errors are raised as 'POOL:<CODE>' and mapped to copy in src/lib/pool/errors.ts.

-- Internal helpers ------------------------------------------------------------

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'POOL:AUTH';
  end if;
  return v_user;
end;
$$;

create function private.require_family()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_family uuid;
begin
  select family_id into v_family from public.family_members where user_id = private.require_user();
  if v_family is null then
    raise exception 'POOL:NO_FAMILY';
  end if;
  return v_family;
end;
$$;

create function private.name_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(display_name, '') from public.profiles where id = p_user),
    'A parent'
  )
$$;

create function private.child_name(p_child uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$ select first_name from public.children where id = p_child $$;

create function private.ride_label(p_ride uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.title || ' · ' || to_char(r.starts_at at time zone t.timezone, 'Dy Mon FMDD, FMHH12:MI AM')
  from public.rides r
  join public.teams t on t.id = r.team_id
  where r.id = p_ride
$$;

create function private.log(
  p_team uuid,
  p_ride uuid,
  p_kind text,
  p_summary text,
  p_detail text default ''
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (team_id, ride_id, actor_id, kind, summary, detail)
  values (p_team, p_ride, auth.uid(), p_kind, p_summary, coalesce(p_detail, ''))
$$;

create function private.lock_ride(p_ride uuid)
returns public.rides
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  if not found or not private.is_team_member(v_ride.team_id) then
    raise exception 'POOL:NOT_FOUND';
  end if;
  return v_ride;
end;
$$;

create function private.is_rider_family_adult(p_ride uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ride_riders rr
    join public.children c on c.id = rr.child_id
    join public.family_members fm on fm.family_id = c.family_id
    where rr.ride_id = p_ride and fm.user_id = auth.uid()
  )
$$;

-- Families with a rider on the ride who have not approved the driver:
-- the driver is not one of their adults and holds no standing approval.
create function private.uncleared_families(p_ride uuid, p_driver uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.family_id
  from public.ride_riders rr
  join public.children c on c.id = rr.child_id
  where rr.ride_id = p_ride
    and not exists (
      select 1 from public.family_members fm
      where fm.family_id = c.family_id and fm.user_id = p_driver
    )
    and not exists (
      select 1 from public.driver_approvals da
      where da.child_id = c.id and da.driver_id = p_driver and da.revoked_at is null
    )
$$;

-- An assigned driver stays cleared if every uncleared family approved them for
-- this ride through a confirmed request.
create function private.driver_still_cleared(p_ride uuid, p_driver uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from private.uncleared_families(p_ride, p_driver) as u(family_id)
    where not exists (
      select 1
      from public.driver_request_approvals a
      join public.driver_requests r on r.id = a.request_id
      where r.ride_id = p_ride
        and r.proposed_driver = p_driver
        and r.status = 'confirmed'
        and a.family_id = u.family_id
        and a.decision = 'approved'
    )
  )
$$;

create function private.check_capacity(p_ride uuid, p_driver uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_seats int;
  v_riders int;
begin
  select seats into v_seats from public.profiles where id = p_driver;
  select count(*) into v_riders from public.ride_riders where ride_id = p_ride;
  if coalesce(v_seats, 0) < v_riders then
    raise exception 'POOL:SEATS';
  end if;
end;
$$;

create function private.expire_stale_requests(p_ride uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.driver_requests
  set status = 'expired', resolved_at = now()
  where ride_id = p_ride and status = 'pending' and expires_at <= now()
$$;

-- "Waiting for David, Chen family and Brooks family."
create function private.waiting_text(p_request uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with waiting as (
    select private.name_of(r.proposed_driver) as who, 0 as ord
    from public.driver_requests r
    where r.id = p_request and r.driver_accepted_at is null
    union all
    select f.name || ' family', 1
    from public.driver_request_approvals a
    join public.families f on f.id = a.family_id
    where a.request_id = p_request and a.decision is null
  )
  select case when count(*) = 0 then ''
    else 'Waiting for ' || string_agg(who, ', ' order by ord, who) || '.' end
  from waiting
$$;

-- Assigns the driver once they accepted and every listed family approved.
create function private.try_confirm(p_request uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.driver_requests;
  v_ride public.rides;
  v_previous uuid;
begin
  select * into v_request from public.driver_requests where id = p_request for update;
  if v_request.status <> 'pending' or v_request.driver_accepted_at is null then
    return false;
  end if;
  if exists (
    select 1 from public.driver_request_approvals
    where request_id = p_request and decision is distinct from 'approved'
  ) then
    return false;
  end if;

  select * into v_ride from public.rides where id = v_request.ride_id for update;
  if v_ride.status <> 'scheduled' then
    raise exception 'POOL:RIDE_CLOSED';
  end if;
  perform private.check_capacity(v_request.ride_id, v_request.proposed_driver);

  v_previous := v_ride.driver_id;
  update public.rides set driver_id = v_request.proposed_driver where id = v_request.ride_id;
  update public.driver_requests set status = 'confirmed', resolved_at = now() where id = p_request;

  perform private.log(
    v_ride.team_id, v_ride.id, 'driver_confirmed',
    private.name_of(v_request.proposed_driver) || ' is confirmed for ' || private.ride_label(v_ride.id),
    case
      when v_previous is not null and v_previous <> v_request.proposed_driver
        then private.name_of(v_previous) || ' is no longer driving this ride.'
      else 'The driver accepted and every family approved.'
    end
  );
  return true;
end;
$$;

-- Shared by claim_ride, propose_driver and create_rides.
create function private.assign_or_request(p_ride uuid, p_driver uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
  v_request uuid;
  v_expires timestamptz;
  v_missing int;
begin
  v_ride := private.lock_ride(p_ride);
  if v_ride.status <> 'scheduled' or v_ride.starts_at <= now() then
    raise exception 'POOL:RIDE_CLOSED';
  end if;
  if p_kind = 'claim' and v_ride.driver_id is not null then
    raise exception 'POOL:ALREADY_ASSIGNED';
  end if;
  if v_ride.driver_id = p_driver then
    raise exception 'POOL:ALREADY_DRIVER';
  end if;
  if not exists (
    select 1 from public.team_members where team_id = v_ride.team_id and user_id = p_driver
  ) then
    raise exception 'POOL:NOT_MEMBER';
  end if;

  perform private.expire_stale_requests(p_ride);
  if exists (select 1 from public.driver_requests where ride_id = p_ride and status = 'pending') then
    raise exception 'POOL:REQUEST_OPEN';
  end if;
  perform private.check_capacity(p_ride, p_driver);

  select count(*) into v_missing from private.uncleared_families(p_ride, p_driver);

  if v_missing = 0 and p_driver = v_me and v_ride.driver_id is null then
    update public.rides set driver_id = p_driver where id = p_ride;
    perform private.log(
      v_ride.team_id, p_ride, 'driver_assigned',
      private.name_of(p_driver) || ' is driving ' || private.ride_label(p_ride),
      'Every rider''s family had already approved them.'
    );
    return 'assigned';
  end if;

  v_expires := v_ride.starts_at - interval '1 hour';
  if v_expires <= now() then
    raise exception 'POOL:TOO_LATE';
  end if;

  insert into public.driver_requests (ride_id, proposed_driver, kind, driver_accepted_at, expires_at, created_by)
  values (p_ride, p_driver, p_kind, case when p_driver = v_me then now() end, v_expires, v_me)
  returning id into v_request;

  insert into public.driver_request_approvals (request_id, family_id)
  select v_request, u.family_id from private.uncleared_families(p_ride, p_driver) as u(family_id);

  perform private.log(
    v_ride.team_id, p_ride, 'request_opened',
    case
      when p_driver = v_me then private.name_of(v_me) || ' offered to drive ' || private.ride_label(p_ride)
      else private.name_of(v_me) || ' proposed ' || private.name_of(p_driver) || ' for ' || private.ride_label(p_ride)
    end,
    private.waiting_text(v_request)
  );

  if private.try_confirm(v_request) then
    return 'assigned';
  end if;
  return 'requested';
end;
$$;

-- Profiles, families, teams ---------------------------------------------------

create function public.update_profile(
  p_display_name text,
  p_phone text,
  p_vehicle text,
  p_plate_last3 text,
  p_seats int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
begin
  if char_length(trim(coalesce(p_display_name, ''))) = 0 then
    raise exception 'POOL:NAME_REQUIRED';
  end if;
  insert into public.profiles (id) values (v_me) on conflict (id) do nothing;
  update public.profiles set
    display_name = trim(p_display_name),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    vehicle = nullif(trim(coalesce(p_vehicle, '')), ''),
    plate_last3 = nullif(upper(trim(coalesce(p_plate_last3, ''))), ''),
    seats = coalesce(p_seats, 0),
    updated_at = now()
  where id = v_me;
end;
$$;

create function public.create_family(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_family uuid;
begin
  if exists (select 1 from public.family_members where user_id = v_me) then
    raise exception 'POOL:HAS_FAMILY';
  end if;
  insert into public.families (name, created_by) values (trim(p_name), v_me) returning id into v_family;
  insert into public.family_members (family_id, user_id) values (v_family, v_me);
  return v_family;
end;
$$;

create function public.add_child(p_first_name text, p_last_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid := private.require_family();
  v_child uuid;
begin
  insert into public.children (family_id, first_name, last_name)
  values (v_family, trim(p_first_name), trim(coalesce(p_last_name, '')))
  returning id into v_child;
  return v_child;
end;
$$;

create function public.create_team(p_name text, p_detail text, p_timezone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_team uuid;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'POOL:BAD_TIMEZONE';
  end if;
  insert into public.teams (name, detail, timezone, created_by)
  values (trim(p_name), trim(coalesce(p_detail, '')), p_timezone, v_me)
  returning id into v_team;
  insert into public.team_members (team_id, user_id, role) values (v_team, v_me, 'organizer');
  perform private.log(v_team, null, 'team_created', private.name_of(v_me) || ' started ' || trim(p_name));
  return v_team;
end;
$$;

-- Returns the raw token once. Only its SHA-256 hash is stored.
create function public.create_invite(p_kind text, p_target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if p_kind = 'team' then
    if not private.is_team_organizer(p_target) then
      raise exception 'POOL:FORBIDDEN';
    end if;
    insert into public.invites (kind, team_id, token_hash, created_by, expires_at)
    values ('team', p_target, sha256(convert_to(v_token, 'UTF8')), v_me, now() + interval '7 days');
  elsif p_kind = 'family' then
    if not private.is_family_adult(p_target) then
      raise exception 'POOL:FORBIDDEN';
    end if;
    insert into public.invites (kind, family_id, token_hash, created_by, expires_at)
    values ('family', p_target, sha256(convert_to(v_token, 'UTF8')), v_me, now() + interval '7 days');
  else
    raise exception 'POOL:BAD_INPUT';
  end if;
  return v_token;
end;
$$;

-- Lets the invite page name the team or family before the person joins.
create function public.invite_preview(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', i.kind,
    'name', coalesce(t.name, f.name),
    'detail', coalesce(t.detail, ''),
    'invited_by', private.name_of(i.created_by)
  )
  from public.invites i
  left join public.teams t on t.id = i.team_id
  left join public.families f on f.id = i.family_id
  where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and i.expires_at > now()
    and (i.kind = 'team' or i.accepted_at is null)
$$;

create function public.accept_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_invite public.invites;
begin
  select * into v_invite
  from public.invites
  where token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
    and expires_at > now()
    and (kind = 'team' or accepted_at is null)
  for update;
  if not found then
    raise exception 'POOL:INVITE_INVALID';
  end if;

  if v_invite.kind = 'team' then
    if not exists (select 1 from public.team_members where team_id = v_invite.team_id and user_id = v_me) then
      insert into public.team_members (team_id, user_id, role) values (v_invite.team_id, v_me, 'member');
      perform private.log(v_invite.team_id, null, 'member_joined', private.name_of(v_me) || ' joined the team');
    end if;
    return jsonb_build_object('kind', 'team', 'id', v_invite.team_id);
  end if;

  if exists (select 1 from public.family_members where user_id = v_me) then
    raise exception 'POOL:HAS_FAMILY';
  end if;
  insert into public.family_members (family_id, user_id) values (v_invite.family_id, v_me);
  update public.invites set accepted_by = v_me, accepted_at = now() where id = v_invite.id;
  return jsonb_build_object('kind', 'family', 'id', v_invite.family_id);
end;
$$;

-- Sets which of the caller's children ride with this team.
create function public.set_team_children(p_team uuid, p_child_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid := private.require_family();
  v_ids uuid[] := coalesce(p_child_ids, '{}');
begin
  if not private.is_team_member(p_team) then
    raise exception 'POOL:NOT_MEMBER';
  end if;
  if exists (
    select 1 from unnest(v_ids) as x(id)
    where not exists (select 1 from public.children c where c.id = x.id and c.family_id = v_family)
  ) then
    raise exception 'POOL:FORBIDDEN';
  end if;

  -- Children leaving the roster leave its upcoming rides too; otherwise they would
  -- ride with families who can no longer see them.
  perform private.remove_rider(
    rr.ride_id, rr.child_id,
    c.first_name || ' left ' || t.name || ' and is off ' || private.ride_label(rr.ride_id)
  )
  from public.ride_riders rr
  join public.rides r on r.id = rr.ride_id
  join public.children c on c.id = rr.child_id
  join public.teams t on t.id = r.team_id
  where r.team_id = p_team and r.status = 'scheduled' and rr.picked_up_at is null
    and c.family_id = v_family and not (rr.child_id = any (v_ids));

  delete from public.team_children tc
  using public.children c
  where tc.child_id = c.id and c.family_id = v_family and tc.team_id = p_team
    and not (tc.child_id = any (v_ids));

  insert into public.team_children (team_id, child_id)
  select p_team, x.id from unnest(v_ids) as x(id)
  on conflict do nothing;
end;
$$;

-- Standing approval of a driver for one child. Revoking also removes the driver
-- from upcoming rides with that child unless the family approved that ride.
create function public.set_driver_approval(p_child uuid, p_driver uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_child public.children;
  v_family_name text;
  v_ride record;
begin
  select * into v_child from public.children where id = p_child;
  if not found or not private.is_family_adult(v_child.family_id) then
    raise exception 'POOL:FORBIDDEN';
  end if;
  if exists (select 1 from public.family_members where family_id = v_child.family_id and user_id = p_driver) then
    raise exception 'POOL:OWN_FAMILY';
  end if;
  if not exists (
    select 1
    from public.team_children tc
    join public.team_members tm on tm.team_id = tc.team_id
    where tc.child_id = p_child and tm.user_id = p_driver
  ) then
    raise exception 'POOL:NOT_MEMBER';
  end if;
  select name into v_family_name from public.families where id = v_child.family_id;

  if p_approved then
    insert into public.driver_approvals (child_id, driver_id, approved_by)
    values (p_child, p_driver, v_me)
    on conflict (child_id, driver_id) where revoked_at is null do nothing;
    if not found then
      return;
    end if;
  else
    update public.driver_approvals
    set revoked_at = now(), revoked_by = v_me
    where child_id = p_child and driver_id = p_driver and revoked_at is null;
    if not found then
      return;
    end if;
  end if;

  insert into public.activity_events (team_id, actor_id, kind, summary)
  select distinct tc.team_id, v_me,
    case when p_approved then 'approval_granted' else 'approval_revoked' end,
    v_family_name || ' family ' || case when p_approved then 'approved ' else 'removed approval for ' end
      || private.name_of(p_driver) || ' to drive ' || v_child.first_name
  from public.team_children tc
  join public.team_members tm on tm.team_id = tc.team_id and tm.user_id = p_driver
  where tc.child_id = p_child;

  if p_approved then
    return;
  end if;

  -- Pending requests that relied on the standing approval can no longer confirm.
  update public.driver_requests r
  set status = 'cancelled', resolved_at = now()
  where r.proposed_driver = p_driver
    and r.status = 'pending'
    and exists (select 1 from public.ride_riders rr where rr.ride_id = r.ride_id and rr.child_id = p_child)
    and not exists (
      select 1 from public.driver_request_approvals a
      where a.request_id = r.id and a.family_id = v_child.family_id and a.decision = 'approved'
    );

  for v_ride in
    select r.id, r.team_id
    from public.rides r
    join public.ride_riders rr on rr.ride_id = r.id and rr.child_id = p_child
    where r.driver_id = p_driver and r.status = 'scheduled' and r.starts_at > now()
    for update of r
  loop
    if not private.driver_still_cleared(v_ride.id, p_driver) then
      update public.rides set driver_id = null where id = v_ride.id;
      perform private.log(
        v_ride.team_id, v_ride.id, 'driver_unassigned',
        private.ride_label(v_ride.id) || ' needs a driver',
        private.name_of(p_driver) || ' is no longer approved to drive ' || v_child.first_name || '.'
      );
    end if;
  end loop;
end;
$$;

-- Rides ---------------------------------------------------------------------

create function public.create_rides(
  p_team uuid,
  p_title text,
  p_local_start timestamp,
  p_pickup text,
  p_dropoff text,
  p_child_ids uuid[],
  p_weeks int default 1,
  p_drive boolean default false,
  p_seats_confirmed boolean default false
)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_timezone text;
  v_children uuid[];
  v_series uuid;
  v_ride uuid;
  v_rides uuid[] := '{}'::uuid[];
begin
  if not private.is_team_member(p_team) then
    raise exception 'POOL:NOT_MEMBER';
  end if;
  if p_weeks is null or p_weeks not between 1 and 12 then
    raise exception 'POOL:BAD_INPUT';
  end if;
  select array_agg(distinct x) into v_children from unnest(p_child_ids) as x where x is not null;
  if coalesce(cardinality(v_children), 0) = 0 then
    raise exception 'POOL:NO_RIDERS';
  end if;
  if exists (
    select 1 from unnest(v_children) as x(id)
    where not exists (select 1 from public.team_children where team_id = p_team and child_id = x.id)
  ) then
    raise exception 'POOL:CHILD_NOT_ON_TEAM';
  end if;
  select timezone into v_timezone from public.teams where id = p_team;
  if (p_local_start at time zone v_timezone) <= now() then
    raise exception 'POOL:IN_PAST';
  end if;
  if p_drive and not coalesce(p_seats_confirmed, false) then
    raise exception 'POOL:SEATS_UNCONFIRMED';
  end if;

  if p_weeks > 1 then
    v_series := gen_random_uuid();
  end if;

  for v_week in 0 .. p_weeks - 1 loop
    insert into public.rides (team_id, series_id, title, starts_at, pickup, dropoff, created_by)
    values (
      p_team, v_series, trim(p_title),
      -- Adding weeks to local time keeps 4:10 PM at 4:10 PM across DST changes.
      (p_local_start + v_week * interval '1 week') at time zone v_timezone,
      trim(p_pickup), trim(p_dropoff), v_me
    )
    returning id into v_ride;
    insert into public.ride_riders (ride_id, child_id) select v_ride, x from unnest(v_children) as x;
    v_rides := v_rides || v_ride;
  end loop;

  perform private.log(
    p_team, v_rides[1], 'rides_planned',
    private.name_of(v_me) || ' planned ' || private.ride_label(v_rides[1]),
    case when p_weeks > 1 then 'Repeats weekly for ' || p_weeks || ' weeks.' else '' end
  );

  if p_drive then
    foreach v_ride in array v_rides loop
      perform private.assign_or_request(v_ride, v_me, 'claim');
    end loop;
  end if;

  return v_rides;
end;
$$;

create function public.claim_ride(p_ride uuid, p_seats_confirmed boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
begin
  if not coalesce(p_seats_confirmed, false) then
    raise exception 'POOL:SEATS_UNCONFIRMED';
  end if;
  return private.assign_or_request(p_ride, v_me, 'claim');
end;
$$;

-- Proposing a replacement for an assigned driver is limited to that driver,
-- an organizer, or an adult with a child on the ride.
create function public.propose_driver(p_ride uuid, p_driver uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
begin
  v_ride := private.lock_ride(p_ride);
  if p_driver = v_me then
    raise exception 'POOL:BAD_INPUT';
  end if;
  if v_ride.driver_id is not null
    and v_ride.driver_id <> v_me
    and not private.is_team_organizer(v_ride.team_id)
    and not private.is_rider_family_adult(p_ride) then
    raise exception 'POOL:FORBIDDEN';
  end if;
  return private.assign_or_request(
    p_ride, p_driver,
    case when v_ride.driver_id is null then 'claim' else 'replacement' end
  );
end;
$$;

create function public.respond_to_request(p_request uuid, p_accept boolean, p_seats_confirmed boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_request public.driver_requests;
  v_team uuid;
begin
  select * into v_request from public.driver_requests where id = p_request for update;
  if not found or v_request.proposed_driver is distinct from v_me then
    raise exception 'POOL:NOT_FOUND';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'POOL:REQUEST_CLOSED';
  end if;
  if v_request.expires_at <= now() then
    raise exception 'POOL:EXPIRED';
  end if;
  v_team := private.ride_team(v_request.ride_id);

  if not p_accept then
    update public.driver_requests set status = 'declined', resolved_at = now() where id = p_request;
    perform private.log(
      v_team, v_request.ride_id, 'request_declined',
      private.name_of(v_me) || ' can''t drive ' || private.ride_label(v_request.ride_id),
      'The driver plan did not change.'
    );
    return 'declined';
  end if;

  if not coalesce(p_seats_confirmed, false) then
    raise exception 'POOL:SEATS_UNCONFIRMED';
  end if;
  perform private.check_capacity(v_request.ride_id, v_me);
  if v_request.driver_accepted_at is null then
    update public.driver_requests set driver_accepted_at = now() where id = p_request;
    perform private.log(
      v_team, v_request.ride_id, 'request_accepted',
      private.name_of(v_me) || ' accepted ' || private.ride_label(v_request.ride_id),
      private.waiting_text(p_request)
    );
  end if;
  if private.try_confirm(p_request) then
    return 'confirmed';
  end if;
  return 'pending';
end;
$$;

create function public.decide_request(p_request uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid := private.require_family();
  v_request public.driver_requests;
  v_family_name text;
  v_team uuid;
begin
  select * into v_request from public.driver_requests where id = p_request for update;
  if not found or not private.is_team_member(private.ride_team(v_request.ride_id)) then
    raise exception 'POOL:NOT_FOUND';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'POOL:REQUEST_CLOSED';
  end if;
  if v_request.expires_at <= now() then
    raise exception 'POOL:EXPIRED';
  end if;

  update public.driver_request_approvals
  set decision = case when p_approve then 'approved' else 'declined' end,
      decided_by = auth.uid(),
      decided_at = now()
  where request_id = p_request and family_id = v_family and decision is null;
  if not found then
    raise exception 'POOL:NOT_REQUIRED';
  end if;

  select name into v_family_name from public.families where id = v_family;
  v_team := private.ride_team(v_request.ride_id);

  if not p_approve then
    update public.driver_requests set status = 'declined', resolved_at = now() where id = p_request;
    perform private.log(
      v_team, v_request.ride_id, 'family_declined',
      v_family_name || ' family declined ' || private.name_of(v_request.proposed_driver)
        || ' for ' || private.ride_label(v_request.ride_id),
      'The driver plan did not change.'
    );
    return 'declined';
  end if;

  perform private.log(
    v_team, v_request.ride_id, 'family_approved',
    v_family_name || ' family approved ' || private.name_of(v_request.proposed_driver)
      || ' for ' || private.ride_label(v_request.ride_id),
    private.waiting_text(p_request)
  );
  if private.try_confirm(p_request) then
    return 'confirmed';
  end if;
  return 'pending';
end;
$$;

create function public.cancel_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_request public.driver_requests;
  v_team uuid;
begin
  select * into v_request from public.driver_requests where id = p_request for update;
  if not found then
    raise exception 'POOL:NOT_FOUND';
  end if;
  v_team := private.ride_team(v_request.ride_id);
  if not private.is_team_member(v_team) then
    raise exception 'POOL:NOT_FOUND';
  end if;
  if v_me is distinct from v_request.created_by
    and v_me is distinct from v_request.proposed_driver
    and not private.is_team_organizer(v_team) then
    raise exception 'POOL:FORBIDDEN';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'POOL:REQUEST_CLOSED';
  end if;
  update public.driver_requests set status = 'cancelled', resolved_at = now() where id = p_request;
  perform private.log(
    v_team, v_request.ride_id, 'request_cancelled',
    private.name_of(v_me) || ' cancelled the driver request for ' || private.ride_label(v_request.ride_id),
    'The driver plan did not change.'
  );
end;
$$;

create function public.release_ride(p_ride uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
begin
  v_ride := private.lock_ride(p_ride);
  if v_ride.driver_id is distinct from v_me then
    raise exception 'POOL:NOT_DRIVER';
  end if;
  if v_ride.status <> 'scheduled' then
    raise exception 'POOL:RIDE_STARTED';
  end if;
  update public.rides set driver_id = null where id = p_ride;
  perform private.log(
    v_ride.team_id, p_ride, 'driver_released',
    private.name_of(v_me) || ' can''t drive ' || private.ride_label(p_ride),
    'This ride needs a driver.'
  );
end;
$$;

create function public.cancel_ride(p_ride uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
begin
  v_ride := private.lock_ride(p_ride);
  if v_ride.created_by is distinct from v_me and not private.is_team_organizer(v_ride.team_id) then
    raise exception 'POOL:FORBIDDEN';
  end if;
  if v_ride.status <> 'scheduled' then
    raise exception 'POOL:RIDE_STARTED';
  end if;
  update public.rides set status = 'cancelled' where id = p_ride;
  update public.driver_requests set status = 'cancelled', resolved_at = now()
  where ride_id = p_ride and status = 'pending';
  perform private.log(
    v_ride.team_id, p_ride, 'ride_cancelled',
    private.name_of(v_me) || ' cancelled ' || private.ride_label(p_ride)
  );
end;
$$;

-- Takes a child off a ride before pickup. Shared by skip_ride and roster changes.
-- Removing a rider never needs approvals. The last rider cancels the ride, and a
-- ride in progress completes once everyone left is handed off.
create function private.remove_rider(p_ride uuid, p_child uuid, p_summary text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ride public.rides;
  v_family uuid;
begin
  select * into v_ride from public.rides where id = p_ride for update;
  select family_id into v_family from public.children where id = p_child;
  if v_ride.status not in ('scheduled', 'in_progress') then
    raise exception 'POOL:RIDE_CLOSED';
  end if;
  delete from public.ride_riders where ride_id = p_ride and child_id = p_child and picked_up_at is null;
  if not found then
    raise exception 'POOL:BAD_STEP';
  end if;

  -- The family no longer has a rider here, so it no longer decides on requests.
  delete from public.driver_request_approvals a
  using public.driver_requests r
  where a.request_id = r.id and r.ride_id = p_ride and r.status = 'pending'
    and a.family_id = v_family
    and not exists (
      select 1 from public.ride_riders rr
      join public.children c on c.id = rr.child_id
      where rr.ride_id = p_ride and c.family_id = v_family
    );

  perform private.log(v_ride.team_id, p_ride, 'rider_skipped', p_summary);

  if not exists (select 1 from public.ride_riders where ride_id = p_ride) then
    update public.rides set status = 'cancelled' where id = p_ride;
    update public.driver_requests set status = 'cancelled', resolved_at = now()
    where ride_id = p_ride and status = 'pending';
    perform private.log(v_ride.team_id, p_ride, 'ride_cancelled', private.ride_label(p_ride) || ' has no riders left');
  elsif v_ride.status = 'in_progress' then
    if not exists (select 1 from public.ride_riders where ride_id = p_ride and handed_off_at is null) then
      update public.rides set status = 'completed' where id = p_ride;
      perform private.log(
        v_ride.team_id, p_ride, 'ride_completed',
        private.ride_label(p_ride) || ' is complete',
        'Every rider''s handoff is confirmed.'
      );
    end if;
  else
    -- Fewer families may now be required, which can complete a pending request.
    perform private.try_confirm(r.id)
    from public.driver_requests r
    where r.ride_id = p_ride and r.status = 'pending' and r.expires_at > now();
  end if;
end;
$$;

create function public.skip_ride(p_ride uuid, p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ride public.rides;
  v_family uuid;
begin
  v_ride := private.lock_ride(p_ride);
  select family_id into v_family from public.children where id = p_child;
  if v_family is null or not private.is_family_adult(v_family) then
    raise exception 'POOL:FORBIDDEN';
  end if;
  perform private.remove_rider(
    p_ride, p_child,
    private.child_name(p_child) || ' isn''t riding ' || private.ride_label(p_ride)
  );
end;
$$;

-- Ride day ------------------------------------------------------------------

create function public.mark_picked_up(p_ride uuid, p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
begin
  v_ride := private.lock_ride(p_ride);
  if v_ride.driver_id is distinct from v_me then
    raise exception 'POOL:NOT_DRIVER';
  end if;
  if v_ride.status not in ('scheduled', 'in_progress') then
    raise exception 'POOL:RIDE_CLOSED';
  end if;
  if v_ride.starts_at - interval '3 hours' > now() then
    raise exception 'POOL:TOO_EARLY';
  end if;
  update public.ride_riders set picked_up_at = now()
  where ride_id = p_ride and child_id = p_child and picked_up_at is null;
  if not found then
    raise exception 'POOL:BAD_STEP';
  end if;
  update public.rides set status = 'in_progress' where id = p_ride and status = 'scheduled';
  perform private.log(
    v_ride.team_id, p_ride, 'picked_up',
    private.name_of(v_me) || ' picked up ' || private.child_name(p_child),
    private.ride_label(p_ride)
  );
end;
$$;

create function public.mark_arrived(p_ride uuid, p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
begin
  v_ride := private.lock_ride(p_ride);
  if v_ride.driver_id is distinct from v_me then
    raise exception 'POOL:NOT_DRIVER';
  end if;
  if v_ride.status <> 'in_progress' then
    raise exception 'POOL:RIDE_CLOSED';
  end if;
  update public.ride_riders set arrived_at = now()
  where ride_id = p_ride and child_id = p_child and picked_up_at is not null and arrived_at is null;
  if not found then
    raise exception 'POOL:BAD_STEP';
  end if;
  perform private.log(
    v_ride.team_id, p_ride, 'arrived',
    private.name_of(v_me) || ' reported arrival with ' || private.child_name(p_child),
    'Waiting for ' || private.child_name(p_child) || '''s family to confirm the handoff.'
  );
end;
$$;

create function public.confirm_handoff(p_ride uuid, p_child uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.require_user();
  v_ride public.rides;
  v_family uuid;
begin
  v_ride := private.lock_ride(p_ride);
  select family_id into v_family from public.children where id = p_child;
  if v_family is null or not private.is_family_adult(v_family) then
    raise exception 'POOL:FORBIDDEN';
  end if;
  if v_ride.status <> 'in_progress' then
    raise exception 'POOL:RIDE_CLOSED';
  end if;
  update public.ride_riders set handed_off_at = now(), handed_off_by = v_me
  where ride_id = p_ride and child_id = p_child and arrived_at is not null and handed_off_at is null;
  if not found then
    raise exception 'POOL:BAD_STEP';
  end if;
  perform private.log(
    v_ride.team_id, p_ride, 'handed_off',
    private.name_of(v_me) || ' confirmed ' || private.child_name(p_child) || ' is with them',
    private.ride_label(p_ride)
  );
  if not exists (select 1 from public.ride_riders where ride_id = p_ride and handed_off_at is null) then
    update public.rides set status = 'completed' where id = p_ride;
    perform private.log(
      v_ride.team_id, p_ride, 'ride_completed',
      private.ride_label(p_ride) || ' is complete',
      'Every rider''s handoff is confirmed.'
    );
  end if;
end;
$$;

-- Grants --------------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.my_family(),
  private.is_family_adult(uuid),
  private.is_team_member(uuid),
  private.is_team_organizer(uuid),
  private.knows_user(uuid),
  private.can_see_family(uuid),
  private.can_see_child(uuid),
  private.ride_team(uuid),
  private.request_team(uuid)
to authenticated;

revoke all on function
  public.update_profile(text, text, text, text, int),
  public.create_family(text),
  public.add_child(text, text),
  public.create_team(text, text, text),
  public.create_invite(text, uuid),
  public.invite_preview(text),
  public.accept_invite(text),
  public.set_team_children(uuid, uuid[]),
  public.set_driver_approval(uuid, uuid, boolean),
  public.create_rides(uuid, text, timestamp, text, text, uuid[], int, boolean, boolean),
  public.claim_ride(uuid, boolean),
  public.propose_driver(uuid, uuid),
  public.respond_to_request(uuid, boolean, boolean),
  public.decide_request(uuid, boolean),
  public.cancel_request(uuid),
  public.release_ride(uuid),
  public.cancel_ride(uuid),
  public.skip_ride(uuid, uuid),
  public.mark_picked_up(uuid, uuid),
  public.mark_arrived(uuid, uuid),
  public.confirm_handoff(uuid, uuid)
from public, anon;

grant execute on function
  public.update_profile(text, text, text, text, int),
  public.create_family(text),
  public.add_child(text, text),
  public.create_team(text, text, text),
  public.create_invite(text, uuid),
  public.invite_preview(text),
  public.accept_invite(text),
  public.set_team_children(uuid, uuid[]),
  public.set_driver_approval(uuid, uuid, boolean),
  public.create_rides(uuid, text, timestamp, text, text, uuid[], int, boolean, boolean),
  public.claim_ride(uuid, boolean),
  public.propose_driver(uuid, uuid),
  public.respond_to_request(uuid, boolean, boolean),
  public.decide_request(uuid, boolean),
  public.cancel_request(uuid),
  public.release_ride(uuid),
  public.cancel_ride(uuid),
  public.skip_ride(uuid, uuid),
  public.mark_picked_up(uuid, uuid),
  public.mark_arrived(uuid, uuid),
  public.confirm_handoff(uuid, uuid)
to authenticated;
