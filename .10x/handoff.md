# Handoff

**From:** SDE + DBA
**To:** QA + Security
**Date:** 2026-10-27

Built: see `.10x/decisions/sde/core-ride-loop.md` (includes 9 deviations to review with Sam).

Verify:
* `npm run db:test` (91 pgTAP), `npm test` (23 unit), `npm run test:e2e` (3 Playwright, needs local Supabase running).
* Review every `security definer` function in `supabase/migrations/20261027000300_write_functions.sql` for an authorization check.
* Review `src/app/actions.ts` and `src/proxy.ts`.
* Design critique of the built screens against `sites/pool-v3.html`.

Nothing is committed. Do not commit.
