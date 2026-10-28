# DBA: core-ride-loop

## Schema notes
* UUID keys everywhere except `activity_events` (identity, gives a stable order inside one transaction).
* `family_members.user_id` is unique: one household per person.
* Partial unique indexes: one active standing approval per (child, driver); one pending request per ride.
* Check constraints enforce rider step order (arrived needs picked up, handoff needs arrived).
* Expiry is read time (`driver_requests_effective`); stale pending rows are marked `expired` lazily when a new request is opened on the ride.

## Indexes
Foreign keys used in RLS helpers and page queries are indexed: `team_members(user_id)`, `team_children(child_id)`, `children(family_id)`, `rides(team_id, starts_at)`, `rides(driver_id)`, `ride_riders(child_id)`, `driver_requests(proposed_driver)`, `driver_request_approvals(family_id)`, `activity_events(team_id, created_at desc)`, `driver_approvals(driver_id)`.

## Migration safety
* Three new migrations, additive only, on an empty schema. `supabase db reset` applies them cleanly.
* `supabase db lint` reports one false positive (`require_family` raising `POOL:AUTH` when the linter calls it without a user).
* Hosted rollout: apply with `supabase db push` after the service role key rotation. No data backfill.

## Watch later
* RLS helpers run per row. At team scale (dozens of rows) this is fine. If a team grows past a few thousand rides, move visibility checks to joins on `team_members`.
