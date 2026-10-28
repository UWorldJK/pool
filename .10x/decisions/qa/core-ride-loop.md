# QA: core-ride-loop

Report: `.10x/reviews/2026-10-27-qa-report.md`. Design critique: `.10x/reviews/2026-10-27-design-critique.md`.

## Strategy
Most confidence comes from pgTAP, because the database is the only enforcement point. Unit tests cover pure helpers. Playwright covers one full two family journey, isolation and phone layout through accessible names.

## /code-review findings (high effort, 10)
Fixed: skip_ride completion, try_confirm on in-progress rides, duplicate attention items, NULL-unsafe cancel_request check, expired requests hidden, nav badge count, off-roster riders, proxy failing without env, duplicated rider timeline.
Skipped (tech debt): `getTeam` makes four sequential round trips.

## Quality gates for the next change
`npm run check`, `npm run db:test`, `npm run test:e2e` all green.
