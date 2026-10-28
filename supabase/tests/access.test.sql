-- Row-level security, grants and invites.
begin;
\ir _helpers.psql
select no_plan();
select pg_temp.seed();

-- Signed out visitors read nothing.
set local role anon;
select throws_ok($$ select * from public.rides $$, '42501', null, 'anon cannot read rides');
select throws_ok($$ select public.claim_ride(gen_random_uuid(), true) $$, '42501', null, 'anon cannot call write functions');
reset role;

-- Members see their team, its roster and its people.
select pg_temp.act_as('sarah');
select is((select count(*) from public.teams), 1::bigint, 'member sees only their own team');
select is((select count(*) from public.team_members where team_id = pg_temp.id('team')), 5::bigint, 'member sees every team member');
select is(
  (select array_agg(first_name order by first_name) from public.children),
  array['Ava', 'Emma', 'Lucas', 'Oliver'],
  'member sees children on the team, not siblings left off it'
);
select ok(exists (select 1 from public.profiles where id = pg_temp.id('david')), 'member sees teammates profiles');
select ok(not exists (select 1 from public.profiles where id = pg_temp.id('olive')), 'member does not see people from other teams');
select ok(not exists (select 1 from public.children where id = pg_temp.id('noah')), 'a child not on the team stays private');

-- Household adults see every child in their household.
select pg_temp.act_as('jamie');
select is(
  (select array_agg(first_name order by first_name) from public.children c where c.family_id = pg_temp.id('morgan')),
  array['Emma', 'Noah'],
  'second adult sees both household children'
);

-- Outsiders see nothing of Northside.
select pg_temp.plan('alex', 'ride', 30, array['emma']);
select pg_temp.act_as('olive');
select is((select count(*) from public.teams where id = pg_temp.id('team')), 0::bigint, 'outsider cannot see the team');
select is((select count(*) from public.rides), 0::bigint, 'outsider cannot see rides');
select is((select count(*) from public.ride_riders), 0::bigint, 'outsider cannot see riders');
select is((select count(*) from public.activity_events where team_id = pg_temp.id('team')), 0::bigint, 'outsider cannot see activity');
select is((select count(*) from public.families where id = pg_temp.id('morgan')), 0::bigint, 'outsider cannot see families');
select throws_ok(
  format('select public.claim_ride(%L, true)', pg_temp.id('ride')),
  'P0001', 'POOL:NOT_FOUND', 'outsider cannot claim a ride'
);

-- No direct writes for anyone signed in.
select pg_temp.act_as('alex');
select throws_ok(
  format('update public.rides set driver_id = %L where id = %L', pg_temp.id('alex'), pg_temp.id('ride')),
  '42501', null, 'members cannot update rides directly'
);
select throws_ok(
  format('insert into public.driver_approvals (child_id, driver_id) values (%L, %L)', pg_temp.id('lucas'), pg_temp.id('alex')),
  '42501', null, 'members cannot insert approvals directly'
);
select throws_ok($$ delete from public.activity_events $$, '42501', null, 'members cannot delete activity');
select throws_ok($$ select private.try_confirm(gen_random_uuid()) $$, '42501', null, 'private write helpers are not callable');

-- Invites.
select pg_temp.act_as('sarah');
select throws_ok(
  format('select public.create_invite(%L, %L)', 'team', pg_temp.id('team')),
  'P0001', 'POOL:FORBIDDEN', 'only organizers create team invites'
);
select throws_ok($$ select public.accept_invite('not-a-token') $$, 'P0001', 'POOL:INVITE_INVALID', 'unknown tokens are refused');
select is(
  public.invite_preview(current_setting('test.team_token')) ->> 'name',
  'Northside FC',
  'invite preview names the team'
);
select pg_temp.act_as('olive');
select is(
  public.accept_invite(current_setting('test.team_token')) ->> 'kind',
  'team',
  'team invite links can be reused'
);
select throws_ok(
  format('select public.accept_invite(%L)', current_setting('test.family_token')),
  'P0001', 'POOL:INVITE_INVALID', 'family invites are single use'
);
select pg_temp.as_admin();
update public.invites set expires_at = now() - interval '1 minute' where kind = 'team';
select pg_temp.act_as('maya');
select throws_ok(
  format('select public.accept_invite(%L)', current_setting('test.team_token')),
  'P0001', 'POOL:INVITE_INVALID', 'expired invites are refused'
);

-- Roster changes only touch your own children.
select pg_temp.act_as('sarah');
select throws_ok(
  format('select public.set_team_children(%L, array[%L]::uuid[])', pg_temp.id('team'), pg_temp.id('emma')),
  'P0001', 'POOL:FORBIDDEN', 'cannot add another family''s child to a team'
);
select throws_ok($$ select public.create_family('Second') $$, 'P0001', 'POOL:HAS_FAMILY', 'one household per person');

select * from finish();
rollback;
