-- Domain rules 1 to 10 from .10x/specs/2026-10-27-core-ride-loop-design.md.
begin;
\ir _helpers.psql
select no_plan();
select pg_temp.seed();

-- Planning --------------------------------------------------------------------
select pg_temp.act_as('alex');
select throws_ok(
  format($$select public.create_rides(%L, 'X', %L, 'A', 'B', array[%L]::uuid[])$$,
    pg_temp.id('team'), pg_temp.local_in(-1), pg_temp.id('emma')),
  'P0001', 'POOL:IN_PAST', 'rides cannot start in the past'
);
select throws_ok(
  format($$select public.create_rides(%L, 'X', %L, 'A', 'B', array[%L]::uuid[])$$,
    pg_temp.id('team'), pg_temp.local_in(5), pg_temp.id('noah')),
  'P0001', 'POOL:CHILD_NOT_ON_TEAM', 'riders must be on the team'
);
select throws_ok(
  format($$select public.create_rides(%L, 'X', %L, 'A', 'B', '{}'::uuid[])$$,
    pg_temp.id('team'), pg_temp.local_in(5)),
  'P0001', 'POOL:NO_RIDERS', 'a ride needs riders'
);

-- Weekly repeats keep local time across the DST change on 2030-11-03.
select pg_temp.remember('dst', (public.create_rides(pg_temp.id('team'), 'To practice', '2030-10-31 16:10',
  'Maple Grove', 'Meadow Park', array[pg_temp.id('emma')], 2))[1]);
select is(
  (select array_agg(to_char(starts_at at time zone 'America/Denver', 'YYYY-MM-DD HH24:MI') order by starts_at)
   from public.rides
   where series_id = (select series_id from public.rides where id = pg_temp.id('dst'))),
  array['2030-10-31 16:10', '2030-11-07 16:10'],
  'weekly rides stay at 4:10 PM local across DST'
);

-- Rule 1: standing approval assigns immediately --------------------------------
select pg_temp.plan('alex', 'solo', 30, array['emma', 'lucas']);
select pg_temp.act_as('sarah');
select public.set_driver_approval(pg_temp.id('lucas'), pg_temp.id('alex'), true);
select pg_temp.act_as('alex');
select throws_ok(
  format('select public.claim_ride(%L, false)', pg_temp.id('solo')),
  'P0001', 'POOL:SEATS_UNCONFIRMED', 'claiming requires confirming seats and restraints'
);
select is(public.claim_ride(pg_temp.id('solo'), true), 'assigned', 'approved by every family: assigned at once');
select is((select driver_id from public.rides where id = pg_temp.id('solo')), pg_temp.id('alex'), 'ride has the driver');
select throws_ok(
  format('select public.claim_ride(%L, true)', pg_temp.id('solo')),
  'P0001', 'POOL:ALREADY_ASSIGNED', 'an assigned ride cannot be claimed'
);

-- Rule 1 fallback: one ride approval for missing families ----------------------
select pg_temp.plan('alex', 'group', 30, array['emma', 'lucas', 'oliver']);
select pg_temp.act_as('sarah');
select is(public.claim_ride(pg_temp.id('group'), true), 'requested', 'missing approvals open a request');
select is((select driver_id from public.rides where id = pg_temp.id('group')), null, 'a request is not an assignment');
select is(
  (select array_agg(f.name order by f.name)
   from public.driver_request_approvals a join public.families f on f.id = a.family_id
   join public.driver_requests r on r.id = a.request_id
   where r.ride_id = pg_temp.id('group')),
  array['Brooks', 'Morgan'],
  'only families without a standing approval are asked'
);
select throws_ok(
  format('select public.claim_ride(%L, true)', pg_temp.id('group')),
  'P0001', 'POOL:REQUEST_OPEN', 'one open request per ride'
);
select pg_temp.remember('group_request', (select id from public.driver_requests where ride_id = pg_temp.id('group')));

select pg_temp.act_as('maya');
select throws_ok(
  format('select public.decide_request(%L, true)', pg_temp.id('group_request')),
  'P0001', 'POOL:NOT_REQUIRED', 'a family without a rider cannot decide'
);
select pg_temp.act_as('jamie');
select is(public.decide_request(pg_temp.id('group_request'), true), 'pending', 'second Morgan adult approves for the family');
select throws_ok(
  format('select public.decide_request(%L, true)', pg_temp.id('group_request')),
  'P0001', 'POOL:NOT_REQUIRED', 'a family decides once'
);
select pg_temp.act_as('david');
select is(public.decide_request(pg_temp.id('group_request'), true), 'confirmed', 'last approval confirms');
select is((select driver_id from public.rides where id = pg_temp.id('group')), pg_temp.id('sarah'), 'confirmed driver is assigned');
select is(
  (select effective_status from public.driver_requests_effective where id = pg_temp.id('group_request')),
  'confirmed', 'request is confirmed'
);

-- Rule 2: capacity --------------------------------------------------------------
select pg_temp.plan('alex', 'full', 30, array['emma', 'lucas', 'oliver']);
select pg_temp.act_as('maya');
select throws_ok(
  format('select public.claim_ride(%L, true)', pg_temp.id('full')),
  'P0001', 'POOL:SEATS', 'riders cannot exceed the driver''s seats'
);

-- Rule 3: proposed driver must accept; swap keeps current driver ----------------
select pg_temp.act_as('david');
select throws_ok(
  format('select public.propose_driver(%L, %L)', pg_temp.id('solo'), pg_temp.id('maya')),
  'P0001', 'POOL:FORBIDDEN', 'unrelated members cannot replace an assigned driver'
);
select pg_temp.act_as('sarah');
select is(public.propose_driver(pg_temp.id('solo'), pg_temp.id('david')), 'requested', 'rider family proposes a swap');
select pg_temp.remember('swap', (select id from public.driver_requests where ride_id = pg_temp.id('solo') and status = 'pending'));
select is((select kind from public.driver_requests where id = pg_temp.id('swap')), 'replacement', 'it is a replacement');
select is((select driver_id from public.rides where id = pg_temp.id('solo')), pg_temp.id('alex'), 'current driver stays during the swap');
select pg_temp.act_as('alex');
select is(public.decide_request(pg_temp.id('swap'), true), 'pending', 'Morgan approves David for this ride');
select pg_temp.act_as('sarah');
select is(public.decide_request(pg_temp.id('swap'), true), 'pending', 'Chen approves; David has not accepted');
select is((select driver_id from public.rides where id = pg_temp.id('solo')), pg_temp.id('alex'), 'still Alex until David accepts');
select pg_temp.act_as('maya');
select throws_ok(
  format('select public.respond_to_request(%L, true, true)', pg_temp.id('swap')),
  'P0001', 'POOL:NOT_FOUND', 'only the proposed driver responds'
);
select pg_temp.act_as('david');
select is(public.respond_to_request(pg_temp.id('swap'), true, true), 'confirmed', 'David accepts and the swap confirms');
select is((select driver_id from public.rides where id = pg_temp.id('solo')), pg_temp.id('david'), 'David now drives');

-- Declines leave the plan alone --------------------------------------------------
select pg_temp.plan('alex', 'declined', 30, array['oliver']);
select pg_temp.act_as('alex');
select is(public.claim_ride(pg_temp.id('declined'), true), 'requested', 'Alex needs the Brooks approval');
select pg_temp.act_as('david');
select is(
  public.decide_request((select id from public.driver_requests where ride_id = pg_temp.id('declined')), false),
  'declined', 'Brooks declines'
);
select is((select driver_id from public.rides where id = pg_temp.id('declined')), null, 'declined request assigns nobody');

-- Rule 4: release ------------------------------------------------------------------
select pg_temp.act_as('sarah');
select throws_ok(
  format('select public.release_ride(%L)', pg_temp.id('solo')),
  'P0001', 'POOL:NOT_DRIVER', 'only the driver releases a ride'
);
select pg_temp.act_as('david');
select lives_ok(format('select public.release_ride(%L)', pg_temp.id('solo')), 'driver releases');
select is((select driver_id from public.rides where id = pg_temp.id('solo')), null, 'released ride has no driver');

-- Rule 6: expiry ---------------------------------------------------------------------
select pg_temp.plan('alex', 'late', 30, array['oliver']);
select pg_temp.act_as('alex');
select is(public.claim_ride(pg_temp.id('late'), true), 'requested', 'Alex still needs the Brooks approval');
select pg_temp.as_admin();
update public.driver_requests set expires_at = now() - interval '1 minute' where ride_id = pg_temp.id('late');
select pg_temp.act_as('david');
select is(
  (select effective_status from public.driver_requests_effective where ride_id = pg_temp.id('late')),
  'expired', 'past the deadline reads as expired'
);
select throws_ok(
  format('select public.decide_request(%L, true)', (select id from public.driver_requests where ride_id = pg_temp.id('late'))),
  'P0001', 'POOL:EXPIRED', 'expired requests cannot be approved'
);
select pg_temp.plan('alex', 'soon', 0.5, array['oliver']);
select pg_temp.act_as('alex');
select throws_ok(
  format('select public.claim_ride(%L, true)', pg_temp.id('soon')),
  'P0001', 'POOL:TOO_LATE', 'no new requests within an hour of the ride'
);

-- Revoking a standing approval removes the driver from upcoming rides ---------------
select pg_temp.plan('alex', 'revoke', 30, array['lucas']);
select pg_temp.act_as('alex');
select is(public.claim_ride(pg_temp.id('revoke'), true), 'assigned', 'Chen already approved Alex');
select pg_temp.act_as('sarah');
select public.set_driver_approval(pg_temp.id('lucas'), pg_temp.id('alex'), false);
select is((select driver_id from public.rides where id = pg_temp.id('revoke')), null, 'revoked driver is unassigned');
select throws_ok(
  format('select public.set_driver_approval(%L, %L, true)', pg_temp.id('emma'), pg_temp.id('sarah')),
  'P0001', 'POOL:FORBIDDEN', 'only the child''s family approves drivers'
);

-- Rules 7 and 8: pickup, arrival, handoff -------------------------------------------
select pg_temp.plan('alex', 'today', 2, array['emma', 'oliver']);
select pg_temp.act_as('alex');
select public.set_driver_approval(pg_temp.id('emma'), pg_temp.id('david'), true);
select pg_temp.act_as('david');
select is(public.claim_ride(pg_temp.id('today'), true), 'assigned', 'David drives his own son and approved Emma');

select pg_temp.plan('alex', 'later', 30, array['emma']);
select pg_temp.act_as('alex');
select public.claim_ride(pg_temp.id('later'), true);
select throws_ok(
  format('select public.mark_picked_up(%L, %L)', pg_temp.id('later'), pg_temp.id('emma')),
  'P0001', 'POOL:TOO_EARLY', 'pickup opens three hours before the ride'
);

select pg_temp.act_as('alex');
select throws_ok(
  format('select public.mark_picked_up(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')),
  'P0001', 'POOL:NOT_DRIVER', 'only the driver marks pickup'
);
select pg_temp.act_as('david');
select throws_ok(
  format('select public.mark_arrived(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')),
  'P0001', 'POOL:RIDE_CLOSED', 'arrival needs a ride in progress'
);
select lives_ok(format('select public.mark_picked_up(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')), 'Emma picked up');
select lives_ok(format('select public.mark_picked_up(%L, %L)', pg_temp.id('today'), pg_temp.id('oliver')), 'Oliver picked up');
select is((select status from public.rides where id = pg_temp.id('today')), 'in_progress', 'first pickup starts the ride');
select throws_ok(
  format('select public.release_ride(%L)', pg_temp.id('today')),
  'P0001', 'POOL:RIDE_STARTED', 'a started ride cannot be released'
);

select pg_temp.act_as('alex');
select throws_ok(
  format('select public.confirm_handoff(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')),
  'P0001', 'POOL:BAD_STEP', 'handoff waits for arrival'
);
select pg_temp.act_as('david');
select lives_ok(format('select public.mark_arrived(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')), 'David reports arrival with Emma');
select throws_ok(
  format('select public.confirm_handoff(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')),
  'P0001', 'POOL:FORBIDDEN', 'the driver cannot confirm another family''s handoff'
);
select pg_temp.act_as('jamie');
select lives_ok(format('select public.confirm_handoff(%L, %L)', pg_temp.id('today'), pg_temp.id('emma')), 'a Morgan adult confirms Emma');
select is((select status from public.rides where id = pg_temp.id('today')), 'in_progress', 'ride continues while Oliver rides');
select pg_temp.act_as('david');
select lives_ok(format('select public.mark_arrived(%L, %L)', pg_temp.id('today'), pg_temp.id('oliver')), 'arrival with Oliver');
select lives_ok(format('select public.confirm_handoff(%L, %L)', pg_temp.id('today'), pg_temp.id('oliver')), 'David confirms his own son');
select is((select status from public.rides where id = pg_temp.id('today')), 'completed', 'all handoffs complete the ride');

-- Skipping a ride ---------------------------------------------------------------------
select pg_temp.plan('alex', 'skip', 30, array['emma', 'lucas']);
select pg_temp.act_as('sarah');
select throws_ok(
  format('select public.skip_ride(%L, %L)', pg_temp.id('skip'), pg_temp.id('emma')),
  'P0001', 'POOL:FORBIDDEN', 'only the child''s family takes them off a ride'
);
select lives_ok(format('select public.skip_ride(%L, %L)', pg_temp.id('skip'), pg_temp.id('lucas')), 'Lucas skips');
select pg_temp.act_as('alex');
select lives_ok(format('select public.skip_ride(%L, %L)', pg_temp.id('skip'), pg_temp.id('emma')), 'Emma skips');
select is((select status from public.rides where id = pg_temp.id('skip')), 'cancelled', 'a ride with no riders is cancelled');

-- Rule 10: audit trail ------------------------------------------------------------------
select pg_temp.act_as('maya');
select ok(
  (select count(*) from public.activity_events where team_id = pg_temp.id('team') and kind = 'handed_off') = 2,
  'every handoff is logged'
);
select ok(
  exists (
    select 1 from public.activity_events
    where kind = 'driver_confirmed' and summary like 'David Brooks is confirmed for To practice%'
      and detail = 'Alex Morgan is no longer driving this ride.'
  ),
  'swap confirmation names both drivers'
);

-- Review fixes (2026-10-27) ---------------------------------------------------------------
-- A ride in progress completes when the last waiting rider is taken off.
select pg_temp.plan('alex', 'partial', 2, array['emma', 'oliver']);
select pg_temp.act_as('david');
select public.claim_ride(pg_temp.id('partial'), true);
select public.mark_picked_up(pg_temp.id('partial'), pg_temp.id('emma'));
select public.mark_arrived(pg_temp.id('partial'), pg_temp.id('emma'));
select pg_temp.act_as('alex');
select public.confirm_handoff(pg_temp.id('partial'), pg_temp.id('emma'));
select pg_temp.act_as('david');
select lives_ok(format('select public.skip_ride(%L, %L)', pg_temp.id('partial'), pg_temp.id('oliver')), 'Oliver skips mid ride');
select is((select status from public.rides where id = pg_temp.id('partial')), 'completed', 'the ride completes when everyone left is home');

-- A deleted request creator does not open cancellation to everyone.
select pg_temp.plan('alex', 'orphan', 30, array['lucas', 'oliver']);
select pg_temp.act_as('alex');
select public.propose_driver(pg_temp.id('orphan'), pg_temp.id('maya'));
select pg_temp.as_admin();
update public.driver_requests set created_by = null where ride_id = pg_temp.id('orphan');
select pg_temp.act_as('sarah');
select throws_ok(
  format('select public.cancel_request(%L)', (select id from public.driver_requests where ride_id = pg_temp.id('orphan'))),
  'P0001', 'POOL:FORBIDDEN', 'a missing creator does not let anyone cancel'
);

-- Leaving the roster takes a child off upcoming rides.
select pg_temp.plan('alex', 'roster', 30, array['emma', 'lucas']);
select pg_temp.act_as('sarah');
select public.set_team_children(pg_temp.id('team'), '{}'::uuid[]);
select is(
  (select count(*) from public.ride_riders where ride_id = pg_temp.id('roster') and child_id = pg_temp.id('lucas')),
  0::bigint, 'a child removed from the team leaves its upcoming rides'
);
select is((select status from public.rides where id = pg_temp.id('roster')), 'scheduled', 'the ride stays for the other riders');

select * from finish();
rollback;
