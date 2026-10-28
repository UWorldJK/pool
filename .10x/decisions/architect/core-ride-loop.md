# Architecture: core-ride-loop

ADRs: 001 (RLS reads, RPC writes), 002 (magic link token hash).
Full data model and function list: spec, sections "Data model" and "Write functions".

## Components
| Unit | Purpose | Depends on |
| --- | --- | --- |
| `supabase/migrations/*` | Tables, RLS, private helpers, write functions | Postgres 17, Supabase auth schema |
| `supabase/tests/*.test.sql` | pgTAP tests for rules and isolation | migrations |
| `src/proxy.ts` | Session refresh and signed out redirect | `@supabase/ssr` |
| `src/lib/supabase/*` | Browser, server clients, generated types | existing helpers |
| `src/lib/pool/*` | Pure helpers: errors, time, status, weekly dates | none |
| `src/lib/pool/queries.ts` | Server only read functions used by pages | server client |
| `src/app/(app)/t/[teamId]/*` | Team screens | queries, actions |
| `src/app/**/actions.ts` | Server Actions calling one RPC each | server client, errors |
| `src/components/*` | Presentational pieces ported from v3 | design tokens |

## Data flow for a claim
1. User submits the claim dialog. Server Action `claimRide(rideId, seatsConfirmed)`.
2. Action calls `rpc('claim_ride')` as the user.
3. Function locks the ride, checks membership, capacity and approvals. Either assigns the driver or creates a request with approval rows for missing families. Writes an activity event.
4. Action revalidates the team path and returns `{ ok, message }` or a mapped error.

## Failure modes
| Failure | Behavior |
| --- | --- |
| Supabase down | Pages show an error boundary with retry; `/api/health` stays up (unchanged). |
| Session expired | Proxy redirects to `/login?next=...`. |
| Two people claim at once | Row lock on the ride; the second sees `POOL:ALREADY_ASSIGNED` or `POOL:REQUEST_OPEN`. |
| Request deadline passes | Read time expiry; functions refuse with `POOL:EXPIRED`. |
| Invite token reused or expired | `POOL:INVITE_INVALID`, single message so tokens cannot be probed. |

## Trade offs accepted
* Team wide visibility of rides and riders (Sam's choice) instead of per ride privacy.
* No realtime: pages refresh after each action; other people's changes appear on next load.
