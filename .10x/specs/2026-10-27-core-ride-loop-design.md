# Pool core ride loop: design

**Date:** 2026-10-27
**Status:** Approved by Sam on 2026-10-27
**Feature slug:** `core-ride-loop`
**Source prototype:** `sites/pool-v3.html` (Lance Kluge, ChatGPT, posted in #social on 2026-10-23)

## Goal

Turn the v3 prototype into a working app for one complete flow: a team of soccer
families plans rides, finds drivers that every rider's family has approved, and
confirms each child's pickup and handoff. Everything runs on the local Supabase
stack. Nothing is deployed and nothing is committed by Claude.

## Decisions made with Sam

| Topic | Decision |
| --- | --- |
| Scope | Core loop without GPS. Ride status comes from people confirming events. |
| Sign in | Email magic link (Supabase Auth). Local emails land in the captured inbox at :54324. |
| Database | Local Supabase only. Jacob's hosted project is untouched until its leaked service role key is rotated. |
| Git | Claude makes no commits. Sam reviews and commits. |
| Driver approval | Standing approvals per child, with a one ride approval request for families that have not approved the driver. |
| Ride creation | One ride, optionally repeated weekly for N weeks. Each week is its own ride. |
| Family | A household with one or more adult accounts and one or more children. Any adult can act for the family's children. |
| Teams | Any parent can create a team and becomes its organizer. Organizers create invite links. Users may belong to several teams. |
| Visibility | Every team member sees the team's rides and riders. Locations are place names, not addresses. |
| End to end tests | Playwright, including magic link sign in through the local inbox API. |

## Out of scope

GPS and live location, the "location delayed" state from v3, SMS and email
notifications, maps, calendar feeds, native apps, editing riders on an existing
ride, payments, background checks, hosted deployment.

## Domain rules

These are the invariants the database enforces. The UI only presents them.

1. **Approval.** A person may drive a ride only when, for every rider, at least one
   of these holds: the driver is an adult in the rider's family; the rider's family
   holds an active standing approval of the driver for that child; or the rider's
   family approved a driver request for this ride.
2. **Capacity.** The number of riders cannot exceed the driver's passenger seats,
   and the driver must confirm seats and required restraints when they accept.
3. **No silent assignment.** A proposed driver is never assigned until they accept
   and every family still required has approved. The current driver stays assigned
   during an optional swap.
4. **Unavailable driver.** A driver can release a ride. The ride then has no driver
   and shows in Needs attention. Any pending request for that ride stays open.
5. **One open request per ride.** At most one pending driver request exists per ride.
6. **Expiry.** A request expires one hour before the ride starts. Expiry is
   computed at read time, so no scheduler is needed. Expired requests cannot be
   accepted or approved.
7. **Handoff.** Per rider: the driver marks picked up, then arrived. Only an adult
   in that rider's family can confirm the handoff, and only after arrival. A map pin
   (later) never confirms a handoff.
8. **Completion.** A ride is complete when every rider is handed off. It is in
   progress from the first pickup.
9. **Team boundary.** Team membership grants visibility of the team's rides. It
   never grants driver approval.
10. **Audit.** Every state change writes an append only activity event naming the
    actor.

## Architecture

```
Browser ──► Next.js 16 App Router (Server Components, Server Actions, proxy.ts)
               │  user session cookie "pool-auth", publishable key only
               ▼
           Supabase (local)
             Auth ── magic link, token hash confirmation
             PostgREST ── SELECT on tables, guarded by RLS
                       ── RPC on public functions, the only write path
             Postgres ── tables, RLS policies, security definer functions
```

* **Reads**: Server Components query tables through the server client. RLS limits
  rows to the caller's teams and families.
* **Writes**: Server Actions call one Postgres function per user action. Each
  function is `security definer`, sets `search_path = ''`, checks `auth.uid()`,
  enforces the rules above in one transaction, and writes the activity event.
  The `authenticated` role has no INSERT, UPDATE or DELETE grant on any table.
* **Auth**: `/login` sends the magic link. The email template links to
  `/auth/confirm?token_hash=...&type=email`, which calls `verifyOtp`. This works
  across devices, unlike the PKCE code flow. `proxy.ts` refreshes the session on
  each request and redirects signed out users away from app routes.
* **Types**: `supabase gen types typescript --local` writes
  `src/lib/supabase/database.types.ts`.

See ADR-001 for the write path decision and ADR-002 for the auth flow.

## Data model

```
profiles            id (= auth.users.id), display_name, phone, vehicle, plate_last3, seats
families            id, name, created_by
family_members      family_id, user_id                         (adults)
children            id, family_id, first_name, last_name
teams               id, name, detail, timezone, created_by
team_members        team_id, user_id, role organizer|member
team_children       team_id, child_id
invites             id, kind team|family, team_id?, family_id?, token_hash, created_by,
                    expires_at, accepted_by?, accepted_at?
driver_approvals    child_id, driver_id, approved_by, created_at, revoked_at?
rides               id, team_id, series_id?, title, starts_at, pickup, dropoff,
                    driver_id?, status scheduled|in_progress|completed|cancelled,
                    created_by, created_at
ride_riders         ride_id, child_id, picked_up_at?, arrived_at?, handed_off_at?,
                    handed_off_by?
driver_requests     id, ride_id, proposed_driver, kind claim|replacement,
                    status pending|confirmed|declined|cancelled, driver_accepted_at?,
                    expires_at, created_by, created_at, resolved_at?
driver_request_approvals  request_id, family_id, decision approved|declined?, decided_by?, decided_at?
activity_events     id, team_id, ride_id?, actor_id, kind, summary, detail, created_at
```

A view `driver_requests_effective` reports `expired` for pending requests past
`expires_at`.

### Write functions

| Function | Who may call | Effect |
| --- | --- | --- |
| `update_profile` | self | Name, phone, vehicle, seats |
| `create_family` | any signed in user without a family | Creates family, caller becomes adult member |
| `add_child` | family adult | Adds a child |
| `create_team` | any signed in user | Creates team, caller is organizer |
| `create_invite` | team organizer, or family adult for family invites | Returns a one time token; only its hash is stored. Expires in 7 days. |
| `accept_invite` | signed in user | Joins the team or family |
| `set_team_children` | family adult who is a team member | Chooses which of their children are on the team |
| `set_driver_approval` | adult in the child's family | Grants or revokes a standing approval |
| `create_rides` | team member | Creates 1 to 12 weekly rides with riders on the team; optionally the caller drives (same checks as a claim) |
| `claim_ride` | team member | Assigns the caller if rule 1 holds, otherwise opens a claim request |
| `propose_driver` | team member | Opens a replacement request for another member |
| `respond_to_request` | proposed driver | Accept (with seats confirmed) or decline |
| `decide_request` | adult of a required family | Approve or decline for that family |
| `cancel_request` | request creator, proposed driver, or organizer | Cancels a pending request |
| `release_ride` | current driver | Driver becomes unavailable |
| `cancel_ride` | ride creator or organizer | Cancels the ride |
| `mark_picked_up`, `mark_arrived` | current driver | Per rider progress |
| `confirm_handoff` | adult in the rider's family | Completes that rider |

When a request has the driver's acceptance and every required family's approval,
the same transaction assigns the driver and marks the request confirmed. A
decline by the driver or any family declines the request.

## Screens (ported from v3)

| Route | v3 view | Content |
| --- | --- | --- |
| `/login` | none | Email field, "Check your email" state |
| `/auth/confirm` | none | Route handler, no UI |
| `/welcome` | none | Profile and vehicle, family and children, then create a team or paste an invite |
| `/invite/[token]` | Invite preview | Accept a team or family invite |
| `/t/[teamId]` | Today | Your children's rides today with per rider status, Needs attention, Coming up |
| `/t/[teamId]/schedule` | Schedule | Week picker, rides by day, Plan a ride dialog |
| `/t/[teamId]/rides/[rideId]` | Ride details dialog | Route, driver, riders and their progress, driver actions, handoff |
| `/t/[teamId]/circle` | My circle | Team families, drivers, your standing approvals per child, invite link |
| `/t/[teamId]/activity` | Activity | Event log, newest first |
| `/settings` | Settings | Profile, vehicle, family, children, appearance |

Needs attention lists, in order: handoffs waiting for you, requests waiting for
your family's decision, requests waiting for your acceptance, your children's
rides in the next 7 days with no driver.

### Visual design

Port v3 tokens (colors, radii, spacing) into Tailwind v4 `@theme` in
`globals.css`. Load DM Sans and Manrope with `next/font/google`, which also
fixes the truncated font import in the v3 export. Light and dark themes follow
`prefers-color-scheme`, with a manual override stored in a cookie so the server
renders the right theme. Keep v3's contrast fixes, 44px touch targets, native
`<dialog>`, visible focus rings and the mobile bottom navigation. Product copy
follows the anti AI writing rules: no em dashes, plain verbs.

## Error handling

* Every write function raises a Postgres exception with a stable code in the
  message (`POOL:NOT_APPROVED`, `POOL:SEATS`, `POOL:EXPIRED`, ...). Server Actions
  map codes to plain sentences and return them to `useActionState`.
* Unexpected errors log on the server and show a generic message. No stack traces
  reach the browser.
* Pages that read data show an empty state instead of failing when a list is
  empty, and `notFound()` when a team or ride is not visible to the caller.

## Testing

| Layer | Tool | Covers |
| --- | --- | --- |
| Database | pgTAP via `supabase test db` | RLS isolation between teams and families; every rule above; every function's authorization |
| Unit | `node --test` (existing) | Pure TypeScript helpers: error code mapping, status derivation, time formatting, weekly date generation |
| End to end | Playwright | Magic link sign in through the mailpit API; plan a ride; claim with fallback approval; pickup, arrival and handoff; release and replace a driver |

Coverage target: every write function has at least one allowed and one refused
test. Every table has an isolation test.

## Build order

1. Schema, RLS, write functions, pgTAP tests, generated types
2. Auth: login, confirm, proxy, sign out, welcome onboarding, teams, invites
3. App shell, design tokens, Schedule, Plan a ride
4. My circle approvals, claim, propose, respond, decide, release
5. Today, ride details, pickup, arrival, handoff, Activity, Settings
6. Verification: code review, security review, design critique against v3, Playwright run

## Known limits accepted for now

* A request expires one hour before the ride. Families who never respond leave the
  ride uncovered, which shows in Needs attention.
* Riders are fixed when a ride is created. Changing riders means cancelling and
  planning again.
* No notifications, so people must open the app to see Needs attention.
* Invite links are shared by hand. Email delivery needs Resend and a hosted project.
