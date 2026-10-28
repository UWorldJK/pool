-- Local demo data: Northside FC from the v3 prototype, mid ride.
-- Appended to supabase/tests/_helpers.psql by scripts/demo-seed.mjs. Run after
-- `npm run supabase:reset`; sign in as alex@example.test (or sarah, david, maya)
-- and read the link in the local inbox at http://localhost:54324.

-- scripts/demo-seed.mjs creates the accounts through Supabase Auth first, so
-- they can sign in. Fixtures attach to those accounts instead of inserting users.
create or replace function pg_temp.make_user(p_name text, p_display text, p_seats int default 3)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  select id into strict v_id from auth.users where email = p_name || '@example.test';
  update public.profiles set display_name = p_display, seats = p_seats where id = v_id;
  perform pg_temp.remember(p_name, v_id);
  return v_id;
end;
$$;

select pg_temp.seed();
update public.profiles p set vehicle = v.vehicle, plate_last3 = v.plate, phone = v.phone
from (values
  ('alex', 'Green Toyota RAV4', '382', '555-0101'),
  ('sarah', 'Silver Volvo XC90', '248', '555-0102'),
  ('david', 'Navy Subaru Ascent', '719', '555-0103'),
  ('maya', 'White Honda Odyssey', '506', '555-0104')
) as v(name, vehicle, plate, phone)
where p.id = pg_temp.id(v.name);

-- Standing approvals, like v3's My circle.
select pg_temp.act_as('alex');
select public.set_driver_approval(pg_temp.id('emma'), pg_temp.id('sarah'), true);
select public.set_driver_approval(pg_temp.id('emma'), pg_temp.id('david'), true);
select pg_temp.act_as('sarah');
select public.set_driver_approval(pg_temp.id('lucas'), pg_temp.id('alex'), true);
select public.set_driver_approval(pg_temp.id('lucas'), pg_temp.id('david'), true);
select pg_temp.act_as('david');
select public.set_driver_approval(pg_temp.id('oliver'), pg_temp.id('sarah'), true);

-- Today: Sarah is driving everyone home. Oliver is handed off; Emma waits for Alex.
select pg_temp.plan('alex', 'today', 1, array['emma', 'lucas', 'oliver']);
select pg_temp.as_admin();
update public.rides set title = 'Home from practice', pickup = 'Meadow Park · North entrance', dropoff = 'Maple Grove · family pickup point'
where id = pg_temp.id('today');
select pg_temp.act_as('sarah');
select public.claim_ride(pg_temp.id('today'), true);
select public.mark_picked_up(pg_temp.id('today'), pg_temp.id(c)) from unnest(array['emma', 'lucas', 'oliver']) c;
select public.mark_arrived(pg_temp.id('today'), pg_temp.id('oliver'));
select pg_temp.act_as('david');
select public.confirm_handoff(pg_temp.id('today'), pg_temp.id('oliver'));
select pg_temp.act_as('sarah');
select public.mark_arrived(pg_temp.id('today'), pg_temp.id('emma'));

-- Tomorrow: practice needs a driver; the ride home has David.
select pg_temp.plan('alex', 'to_practice', 26, array['emma', 'lucas', 'oliver']);
select pg_temp.as_admin();
update public.rides set pickup = 'Maple Grove · family pickup point', dropoff = 'Meadow Park · North entrance'
where id = pg_temp.id('to_practice');
select pg_temp.plan('sarah', 'home', 28, array['emma', 'lucas', 'oliver']);
select pg_temp.as_admin();
update public.rides set title = 'Home from practice', pickup = 'Meadow Park · North entrance', dropoff = 'Maple Grove · family pickup point'
where id = pg_temp.id('home');
select pg_temp.act_as('david');
select public.claim_ride(pg_temp.id('home'), true);

-- Saturday: Maya offered to drive Emma and Ava; the Morgan family hasn't answered.
select pg_temp.plan('maya', 'match', 74, array['emma', 'ava']);
select pg_temp.as_admin();
update public.rides set title = 'To the match', pickup = 'Maple Grove · family pickup point', dropoff = 'Riverside Fields · Field 2'
where id = pg_temp.id('match');
select pg_temp.act_as('maya');
select public.claim_ride(pg_temp.id('match'), true);

select pg_temp.as_admin();
