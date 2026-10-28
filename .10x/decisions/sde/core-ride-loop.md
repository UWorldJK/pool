# What was built: core-ride-loop

## Database
* `supabase/migrations/20261027000100_core_schema.sql`: 14 tables, `driver_requests_effective` view, profile trigger.
* `supabase/migrations/20261027000200_access_rules.sql`: `private` policy helpers, SELECT only grants, RLS on every table.
* `supabase/migrations/20261027000300_write_functions.sql`: 22 public write functions plus private helpers.
* `supabase/tests/`: `_helpers.psql` (fixtures, `act_as`), `access.test.sql`, `rides.test.sql`. 91 tests.
* `supabase/config.toml`: magic link and confirmation templates, `otp_expiry`, local email rate limit.
* `supabase/templates/magic_link.html`.

## App
* `src/proxy.ts`: session refresh and signed out redirect.
* `src/lib/pool/`: `data.ts` (server reads), `rides.ts` (pure status logic), `errors.ts`, `time.ts`, `form.ts`, `paths.ts`, `action-result.ts`.
* `src/app/actions.ts`: all Server Actions.
* Routes: `/`, `/login`, `/auth/confirm`, `/welcome`, `/invite/[token]`, `/teams/new`, `/settings`, `/t/[teamId]` (Today), `/schedule`, `/rides/[rideId]`, `/circle`, `/activity`, `/riders`, `/settings`.
* Components: icon, bits, dialog, action form, toaster, ride card, ride actions, plan ride, invite link, approval toggle, timezone select.
* `src/app/globals.css`: v3 tokens and components, dark mode by system or cookie.

## Tests
* `scripts/pool-lib.test.mjs` (11 tests). Fixed a pre-existing Windows path bug in `scripts/supabase-server.test.mjs`.
* `e2e/` Playwright: two family journey, outsider isolation, phone width. `npm run test:e2e`.

## Deviations from the spec (decided during build, logged for Sam)
1. **`skip_ride` added.** A family can take their child off a ride before pickup. Without it a sick child blocks completion forever. Removing a rider never needs approvals.
2. **Replacement proposals are limited** to the current driver, an organizer, or an adult with a child on the ride. Otherwise any member could knock a driver off a ride by proposing someone else.
3. **Team invite links are reusable** for 7 days; household links are single use. Matches "share one link in the team chat".
4. **Revoking a standing approval unassigns** the driver from upcoming rides with that child unless the family approved that specific ride, and cancels pending requests that relied on it.
5. **Pickup opens 3 hours before the ride** (`POOL:TOO_EARLY`) to stop accidental taps days ahead.
6. **No "location delayed" state** (no GPS); the Today hero says "no live location" explicitly.
7. **Settings live under the team** (`/t/[id]/settings`); `/settings` redirects there.
8. **Success feedback is a toast**, like v3, because a successful action often removes the form that sent it.
9. **Sign in "next" path is stored in a short cookie**, not in the email link, so the email template stays the same for every link.

## Tech debt
* Activity summaries are stored as text at write time; renaming a person does not update old entries.
* No pagination on Activity beyond 50 events.
* `getTeam` issues several sequential queries per request; fine at team scale, worth a view or RPC later.
* `database.types.ts` is unformatted generator output and is lint ignored.
