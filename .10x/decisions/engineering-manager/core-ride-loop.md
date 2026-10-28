# Delivery plan: core-ride-loop

Sequenced so each milestone is verifiable on its own. All work stays uncommitted for Sam to review.

| # | Task | Depends on | Done when |
| --- | --- | --- | --- |
| M1.1 | Migration: tables, constraints, indexes | none | `supabase db reset` applies cleanly |
| M1.2 | Migration: private helpers and RLS select policies, grants | M1.1 | isolation tests pass |
| M1.3 | Migration: write functions | M1.2 | rule tests pass |
| M1.4 | pgTAP tests for isolation, every function allowed and refused | M1.3 | `supabase test db` green |
| M1.5 | Generate types, wire `Database` into clients | M1.3 | typecheck green |
| M2.1 | Auth config: email template, rate limit, redirect URLs | none | link arrives in mailpit with token hash |
| M2.2 | `/login`, `/auth/confirm`, sign out, `proxy.ts` | M2.1 | manual sign in works |
| M2.3 | `/welcome` onboarding, team create, invites, `/invite/[token]` | M1, M2.2 | new user reaches a team |
| M3.1 | Design tokens, fonts, app shell, nav, dialog primitive | none | shell matches v3 at 1440 and 390 px |
| M3.2 | Schedule week view and Plan a ride | M1, M3.1 | rides appear by day |
| M4.1 | My circle: families, approvals, invite link | M3.1 | approvals toggle |
| M4.2 | Claim, propose, respond, decide, cancel, release | M4.1 | request flow works both paths |
| M5.1 | Today: status hero, Needs attention, Coming up | M4 | matches v3 states |
| M5.2 | Ride details, pickup, arrival, handoff | M5.1 | ride completes |
| M5.3 | Activity, Settings | M1 | lists events, edits profile |
| M6.1 | Playwright setup and journeys | M5 | journeys green |
| M6.2 | Code review, security review, design critique, fixes | M6.1 | reports in `.10x/reviews/` |

## Risks
* Next.js 16 and `@supabase/ssr` 0.12 APIs changed recently. Check installed type definitions before relying on memory.
* pgTAP role switching for `auth.uid()` needs `request.jwt.claims` set per test.
* Magic link e2e depends on mailpit's API shape. Check it on the running stack.
