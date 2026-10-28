# Implementation approach: core-ride-loop

## Tricky parts
* **Policy recursion.** RLS on `team_members` that queries `team_members` recurses. Use `private.*` `security definer` `stable` helpers that read membership with RLS bypassed.
* **Required families.** Computed once when a request opens: families of riders where the driver is not a family adult and holds no active standing approval. Stored as `driver_request_approvals` rows with a null decision. Confirmation checks that all rows are approved and the driver accepted.
* **Self claim with full approval.** Assign directly, no request row, activity event only.
* **Self claim, missing approvals.** Request with `driver_accepted_at = now()` since the claimer is the driver.
* **Locking.** `select ... for update` on the ride inside every function that changes driver or request state.
* **Weekly repeats in the team timezone.** `(local_start + n * interval '1 week') at time zone tz` keeps 4:10 PM local across DST.
* **Expiry.** `expires_at = starts_at - interval '1 hour'`; refuse creating a request when that is already past.
* **pgTAP auth.** Helper `tests.act_as(uuid)` sets `request.jwt.claims` and `role authenticated`.
* **Next 16.** `params` and `cookies()` are async. Proxy file is `src/proxy.ts` exporting `proxy`. Check `node_modules/next` docs before writing.

## Files to change
* Existing: `src/lib/supabase/client.ts`, `server.ts` (Database generic), `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `supabase/config.toml`, `package.json` scripts, `README.md`.
* New: listed in `architect/core-ride-loop.md`.
