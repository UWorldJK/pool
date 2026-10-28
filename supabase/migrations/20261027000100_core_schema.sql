-- Core tables for the ride loop. Access rules are in the next migration; every
-- write goes through the functions in 20261027000300_write_functions.sql.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  phone text check (char_length(phone) <= 30),
  vehicle text check (char_length(vehicle) <= 80),
  plate_last3 text check (plate_last3 ~ '^[A-Za-z0-9]{1,4}$'),
  seats smallint not null default 0 check (seats between 0 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A person belongs to at most one household.
create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  last_name text not null default '' check (char_length(last_name) <= 40),
  created_at timestamptz not null default now()
);
create index children_family_idx on public.children (family_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  detail text not null default '' check (char_length(detail) <= 80),
  timezone text not null default 'America/Denver',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id);

create table public.team_children (
  team_id uuid not null references public.teams (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, child_id)
);
create index team_children_child_idx on public.team_children (child_id);

-- Team invites are reusable links until they expire; family invites are single use.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('team', 'family')),
  team_id uuid references public.teams (id) on delete cascade,
  family_id uuid references public.families (id) on delete cascade,
  token_hash bytea not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  check (
    (kind = 'team' and team_id is not null and family_id is null)
    or (kind = 'family' and family_id is not null and team_id is null)
  )
);

create table public.driver_approvals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  driver_id uuid not null references auth.users (id) on delete cascade,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null
);
create unique index driver_approvals_active_idx
  on public.driver_approvals (child_id, driver_id) where revoked_at is null;
create index driver_approvals_driver_idx on public.driver_approvals (driver_id);

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  series_id uuid,
  title text not null check (char_length(title) between 1 and 60),
  starts_at timestamptz not null,
  pickup text not null check (char_length(pickup) between 1 and 100),
  dropoff text not null check (char_length(dropoff) between 1 and 100),
  driver_id uuid references auth.users (id) on delete set null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index rides_team_start_idx on public.rides (team_id, starts_at);
create index rides_driver_idx on public.rides (driver_id);

create table public.ride_riders (
  ride_id uuid not null references public.rides (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  picked_up_at timestamptz,
  arrived_at timestamptz,
  handed_off_at timestamptz,
  handed_off_by uuid references auth.users (id) on delete set null,
  primary key (ride_id, child_id),
  check (arrived_at is null or picked_up_at is not null),
  check (handed_off_at is null or arrived_at is not null)
);
create index ride_riders_child_idx on public.ride_riders (child_id);

create table public.driver_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  proposed_driver uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('claim', 'replacement')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'expired')),
  driver_accepted_at timestamptz,
  expires_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index driver_requests_one_pending_idx
  on public.driver_requests (ride_id) where status = 'pending';
create index driver_requests_driver_idx on public.driver_requests (proposed_driver);

create table public.driver_request_approvals (
  request_id uuid not null references public.driver_requests (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  decision text check (decision in ('approved', 'declined')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  primary key (request_id, family_id)
);
create index driver_request_approvals_family_idx on public.driver_request_approvals (family_id);

create table public.activity_events (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  ride_id uuid references public.rides (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null,
  summary text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index activity_events_team_idx on public.activity_events (team_id, created_at desc);

-- Requests past their deadline read as expired without a scheduler.
create view public.driver_requests_effective with (security_invoker = true) as
select
  r.*,
  case when r.status = 'pending' and r.expires_at <= now() then 'expired' else r.status end
    as effective_status
from public.driver_requests r;

-- Every account gets a profile row so drivers have somewhere to store seats.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
