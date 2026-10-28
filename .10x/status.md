# Status

**Feature:** core-ride-loop
**Phase:** Verification complete. Ready for Sam's review. Delivery (hosting) not in scope.
**Commits:** none by Claude, by Sam's instruction.

| Phase | State |
| --- | --- |
| Discovery | Complete (2026-10-27) |
| 0 Brainstorming | Complete, spec approved |
| 1 Strategy | Complete |
| 2 Design | Complete, ADR-001, ADR-002 |
| 3 Planning | Complete |
| 4 Implementation | Complete |
| 5 Verification | Complete. See `.10x/reviews/` |
| 6 Delivery | Not in scope (local only) |

## Tasks
- [x] M1.1 tables
- [x] M1.2 RLS
- [x] M1.3 write functions
- [x] M1.4 pgTAP
- [x] M1.5 types
- [x] M2.1 auth config
- [x] M2.2 login, confirm, proxy
- [x] M2.3 onboarding, teams, invites
- [x] M3.1 tokens and shell
- [x] M3.2 schedule and plan a ride
- [x] M4.1 circle and approvals
- [x] M4.2 driver requests
- [x] M5.1 today
- [x] M5.2 ride details and handoff
- [x] M5.3 activity, settings
- [x] M6.1 Playwright
- [x] M6.2 reviews

## Blockers
* None. Hosted Supabase use is blocked on key rotation (out of scope).

## Verification so far (2026-10-27)
* pgTAP: 96 tests pass (`npm run db:test`).
* Unit: 23 tests pass (`npm test`), including a Windows path fix in `scripts/supabase-server.test.mjs` (pre-existing failure).
* Lint and typecheck clean.
* Playwright: 3 tests pass (`npm run test:e2e`).
* Manual in browser pane: magic link sign in, onboarding, plan ride as driver, pickup, arrival, handoff, schedule, circle, activity.
* `/code-review` (high): 10 findings, 9 fixed, 1 logged as tech debt.
* Security review and design critique written; open items listed in each.
* `npm run check` (lint, typecheck, unit, production build) passes.

## Open for Sam
* Review the 9 build decisions in `.10x/decisions/sde/core-ride-loop.md`.
* Rotate the hosted service role key before any hosted use.
* Next candidates: notifications (email first), revoking invite links, removing members.
