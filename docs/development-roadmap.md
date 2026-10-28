# Pool development roadmap

Planning date: October 26, 2026 (America/Denver). **Proposed plan, not an
approved specification or a record of implemented capabilities.**

Five ordered PRs reach a working web coordination milestone. Three follow-up
PRs add day-of-ride handling, replacement approvals, and visual parity. These
are roadmap labels, not assigned GitHub PR numbers. Only one implementation PR
is active at a time.

## Verified starting point

- Workspace: `/Users/lancekluge/git/pool`; current planning branch:
  `lkluge/plan-app-roadmap`.
- `HEAD`, local `main`, `origin/main`, and GitHub's current `main` resolve to
  `343f5abd59c77d3d6f06a542557b329c464177c0` (`343f5ab`). GitHub confirms
  [PR #2](https://github.com/UWorldJK/pool/pull/2) merged at that commit.
- Before this document, the tracked working tree was clean. `sites/` and
  `exports/` are untracked local references, including nested Git repositories.
  Preserve them; never blanket-stage, clean, move, or overwrite them.
- Read `README.md`, `docs/deployment.md`, package and runtime configuration,
  Docker/Compose configuration and ignore rules, all Supabase helpers, local
  Supabase configuration, application routes, and all scripts/tests.
- Installed foundation: Next.js 16.4.3, React 19.3.1, TypeScript 5.9.3,
  `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0, Supabase CLI 2.122.0.
  `.nvmrc` and Docker pin Node.js 24.22.1; `package.json` specifies Node 24.x.
- The homepage and `/api/health` are the only application routes. There is no
  session-refresh proxy, application schema, application RLS, authentication
  UI, CI workflow, or ride workflow. Realtime being enabled in local Supabase
  does not mean the application uses it. Storage and Edge Runtime are disabled.
- Both normal Supabase clients use the public key. The server client preserves
  the internal Docker URL override and shared `pool-auth` cookie name. Its
  current cookie writer is intended for Route Handlers/Server Actions; server
  rendering needs deliberate handling in R2.
- `supabase:check` checks Auth health/settings, not database access. `/api/health`
  is application liveness, not Supabase readiness. Preserve these meanings.
- Validation during planning: all six v3 model tests passed. The host's default
  Node 25.2.1 passed lint/type checking but could not complete tests because of
  restricted local listeners and a module-mocking incompatibility. Retesting
  with `docker compose run --rm --no-deps -e NODE_ENV=production web npm run check`
  passed lint, type checking, all 12 application tests, and the production build.
  The earlier development/production container smoke and public-key connectivity
  results are recorded in PR #2; they were not all rerun for this document.
- Existing delivery instructions describe manual Vercel **container** deployment.
  No hosted project, credential, SMTP setup, branch protection, or deployment
  configuration was changed or presumed present during planning.

## Product evidence and conflicts

The current R8 correction explicitly makes `exports/pool-v3.html` the visual
source of truth, clarified by `sites/pool-prototype-v3/dist`, its design notes and
behavioral tests. This supersedes original-first and Apple-inspired simplification
guidance. The export has a malformed font import; use the distribution to establish
DM Sans/Manrope rendering, preserving every reference file unchanged. Continue on
existing PR #10 and `lkluge/web-visual-parity`; no new branch/PR or release.


Inspected both `sites/pool-prototype/dist` and
`sites/pool-prototype-v3/dist`, v3's `DESIGN-NOTES.md`,
`tests/model.test.cjs`, and `exports/pool-v3.html`. The bundled v3 `dist/v1/`
files match the original reference. The standalone export embeds the same model;
its application script differs only by making the original-site link absolute.
No external Claude artifact was needed to establish the local behavior.

| Topic | Original reference | V3 correction / implementation consequence |
| --- | --- | --- |
| Visual authority | Original visual character was the earlier R8 direction. | The v3 export is authoritative for typography, palette, shell, mobile navigation, density, route cards and dialog patterns. The original is secondary historical context. Real capabilities and actor authority remain mandatory. |
| Driver unavailable versus optional swap | Keeps the original driver assigned throughout a change; no unavailable state; incomplete confirmations can stay pending indefinitely. | v3 clears an unavailable driver immediately. Decline, cancellation, and expiry leave that ride uncovered. Only a genuinely available driver stays assigned during an optional swap. Preserve this in R5/R7. |
| Approval authority | Demo controls simulate every family and driver; a final button applies the change. | v3 separates the parent's own approval from simulation tools and commits after all required replies. Real actors may respond only for themselves/their children; no override button can fabricate others' consent. |
| Arrival and receipt | Handoff copy is explicit, but arrival exists only inside a preview and the model has one `arrived` flag. | v3 persists `awaiting` separately from `complete`. R6 needs child-specific pickup, driver-reported arrival, and recipient-confirmed handoff; a ride-wide flag cannot represent all children. |
| Route and seats | Planning has one location/direction field, and choosing oneself as driver bypasses the claim checkbox. Some vehicle displays fall back to the wrong person's vehicle. | v3 separates pickup/destination and checks seats in planning UI. Store real routes and vehicles; validate capacity and restraint acknowledgment on the server/database too. |
| Schedule and status | Direction tabs and reassuring coverage copy can obscure open needs. | Retain all directions in the weekly view and a needs-attention list; distinguish proposal, confirmed driver, unavailable driver, and missing receipt. |
| Location | Illustrative maps and sample ETAs can look operational. | v3 removes the current ETA when updates are stale. Neither version implements GPS. M1 has no map, live position, ETA, or claim that sharing has started/stopped. |
| Trust and visibility | Mentions approved circles; some copy limits exact pickup details to drivers, elsewhere to participants. | Adopt an explicit access matrix below: circle membership is separate from child/ride consent; exact trip details are limited to participating families and the confirmed driver. This is a proposed resolution. |

The prototypes are behavioral examples, not an authorization implementation.
Names, three-family approval lists, dates, vehicles, and clocks are hard-coded.
v3 `plan` accepts arbitrary data at model level; `claim-custom` does not itself
enforce the UI's capacity checkbox. Arrival can still move backwards before
completion through simulation controls. Do not port those shortcuts. The six
tests supply useful scenarios, but do not prove database permissions, concurrent
updates, real deadlines, or multi-child correctness. Browser storage, activity
logs, invitations, notifications, calls, and availability suggestions are simulated.

## Milestones and ordered chain

| Order | Proposed PR title | Branch | Demonstrable result |
| --- | --- | --- | --- |
| R1 | Add automated checks and gated Vercel delivery | `lkluge/ci-vercel-delivery` | Tested container builds and a verified path to isolated previews and production. |
| R2 | Add real sign-in and session-aware application shell | `lkluge/auth-session-flow` | An adult can sign in, refresh, sign out, and reach a protected empty app. |
| R3 | Add families, circles, and secure membership invitations | `lkluge/family-circle-membership` | Two real families join a circle through authorized, persisted invitations. |
| R4 | Add persisted ride planning and family rider enrollment | `lkluge/ride-planning` | Families create, join, and view actual scheduled rides with distinct pickup/drop-off. |
| R5 | Add driver acceptance, child consent, and capacity enforcement | `lkluge/driver-confirmation` | A ride acquires one valid, consenting driver; all participants see the same saved plan. **M1 complete.** |
| R6 | Add pickup, arrival, and child handoff confirmation | `lkluge/ride-handoffs` | Actual adults report trip events and confirm receipt per child. |
| R7 | Add replacement requests and family approvals | `lkluge/driver-replacements` | Optional swaps and unavailable-driver replacements follow real approval/deadline rules. **M2 complete.** |
| R8 | Match Pool v3 with real workflows | `lkluge/web-visual-parity` | The working app closely matches v3 while retaining real records and corrected behavior. |

This keeps infrastructure, authentication, membership, planning, and driver
confirmation independently reviewable. Each schema addition arrives with its
authorization tests and usable screens; there is no speculative all-product
schema PR or a disconnected frontend-only implementation phase.

### M1: what “working” means

In two independent browser sessions, adults can verify their email and sign in,
create families, invite another family into a circle, register their own children,
create a ride, enroll each family's own riders, nominate a driver, accept as that
driver, and approve that driver for each enrolled child. Once all required consent,
seat, and scheduling checks pass, one confirmed assignment appears for everyone.
Reloading or using another device preserves the result. A third unrelated user
cannot obtain the children, addresses, ride, or consent by guessing IDs or calling
Supabase directly. Declining or withdrawing never silently confirms someone else.

M1 includes functional, responsive, keyboard-usable onboarding, family/circle,
schedule, ride-detail, driver-profile, and confirmation screens, with real loading,
empty, failure, and stale-update states. It runs locally and on an isolated hosted
test environment; production release wiring and environment separation are verified
before calling the hosted milestone complete. Missing hosted setup is an explicit
delivery blocker, not evidence that deployment works.

M1 is a working **scheduling and assignment** milestone. It does not claim to track
an ongoing journey or confirm child receipt. Past pickup time does not imply that a
ride completed. R6/R7 complete the core operational workflow (M2). Exact visual and
interaction parity is R8, after functional backend/screens exist.

### Proposed constraints and unresolved decisions

These are recommendations for scoping the PRs. Confirm material product changes
before their owning PR; do not treat this document as prior approval of accounts,
subscriptions, provider settings, or policy choices.

| Decision | Recommended planning default | Resolve by |
| --- | --- | --- |
| Platform | Next.js remains both web UI and server application layer; Supabase supplies Postgres/Auth. No Java service. React Native/Expo is a separate future platform decision; no native project is created here. | Fixed scope of this roadmap |
| Sign-in | Email/password with email confirmation and password recovery; adult accounts only. Use local captured mail for development and configured SMTP for hosted accounts. Social login/MFA are separate work. | R2 |
| Family authority | A child belongs to one family record for M1; multiple adult guardians may belong to that family. Guardians may enroll/consent only for their own family's children. One owner manages guardian invitations/removal; protect the last owner. Cross-household custody is deferred. | R3/R4 |
| Circle authority | A circle is the coordination group, not a team-wide permission grant. A designated adult coordinator manages family membership, not other families' child consent. An adult can belong to multiple families/circles; every command names and verifies its context. | R3 |
| Invitations | Expiring, single-use, email-bound links copied by an authorized user and delivered manually. Default expiry: seven days. Family invitation and circle invitation are distinct scopes. Automated invitation email is deferred; account confirmation/recovery email is required. | R3 |
| Initial driver approval | Explicit consent per child for this ride's proposed driver and plan revision. One guardian action may cover all their own enrolled children. No standing trust list or invitation counts as consent. | R5 |
| Ride shape | One occurrence, one common pickup and one common destination, one vehicle/driver, multiple children. Include expected end time for conflict checks and an IANA timezone. Recurrence, multi-stop routing, and carpools needing multiple vehicles are deferred. | R4 |
| Capacity | Passenger seats exclude the driver. All enrolled riders occupy a seat for the entire interval. Driver explicitly attests to required restraints; do not label this independently verified. | R5 |
| Visibility | Invited families get a minimal invitation summary; joined families and confirmed driver get exact trip details. Proposed drivers get time, coarse route, counts, and necessary restraint requirements before acceptance, without unrelated child records/addresses. Other circle members get no ride directory. | R4/R5 |
| Changes to a confirmed plan | No general editing in M1: cancel/recreate or withdraw the assignment and start a new proposal. No silent carryover of consent to a changed roster, route, time, driver, or vehicle. | R5 |
| Handoff recipient | An enrolled child's designated active guardian confirms receipt; driver status alone grants no receiving authority. Confirm whether a driver who is also that child's designated guardian may perform both roles. External recipients are deferred. | R6 |
| Hosting | Keep Vercel containers. Recommend GitHub Actions owning ordered delivery through the Vercel CLI, with competing Git-triggered deployments disabled. This deliberately revises the existing docs' proposed direct Git auto-deploy path to prevent migration races. | R1 |
| Hosted setup | Identify Vercel project/team, test and production Supabase projects, environment owners, SMTP sender, redirect origins, deployment protection, and any spending approval. None is verified by this plan. | R1/R2 |
| Pilot retention | Decide retention/deletion for child and trip records, responsible contact, and account-removal handling before using real family data. Do not collect birth dates, school rosters, or full license plates just to reproduce sample UI. | Before real-data pilot |

## Shared technical contract

### Schema direction, added only when needed

Names below are proposed, not existing tables. Use UUID identities, foreign keys,
server timestamps, non-null requirements, explicit constraints and indexes, and
versioned SQL migrations. Add checked-in generated database types with each schema
PR. Changes must work from both a clean reset and the preceding merged schema.

| Added in | Data | Key invariants |
| --- | --- | --- |
| R3 | `profiles`, `families`, `family_members`, `circles`, `circle_families`, `invitations` | Profile references Auth UUID; unique active memberships; authorized owner/coordinator; exactly one invitation target scope; token digest only, normalized verified email, expiry/revocation/consumption metadata. |
| R4 | `children`, `rides`, `ride_families`, `ride_riders`, `ride_locations` | Child has owning family; ride has one circle, creator, start/end/timezone, revision and cancellation state; enrolled family belongs to circle; one rider per child per ride; family/child/ride consistency enforced. Separate exact locations from minimal summaries. |
| R5 | `vehicles`, `driver_proposals`, `ride_driver_consents`, `driver_assignments` | Vehicle belongs to driver, positive integral passenger capacity; proposals reference a frozen ride revision and vehicle version; consent unique per proposal/child with actor/time; one active assignment per ride; no overlapping accepted driver/vehicle reservations. |
| R6 | `ride_events` and per-rider progress/recipient fields | Append-only actor/timestamp events; event write and state transition are one transaction; no client-supplied actor/timestamp; terminal child completion cannot reopen. |
| R7 | Extend proposals with replacement mode/current-assignment reference and approval deadline | At most one pending proposal per ride; all replies bind to its revision; preserve declined/cancelled/expired history; finalization replaces an assignment once, atomically. |

Keep base child records private to their family. Store only necessary ride-specific
child display/seat information as enrollment snapshots, or provide an equally
restricted projection; joining a ride must not expose the source child's full
profile. Likewise, a circle directory exposes limited adult/vehicle fields, never
Auth emails, invitation token digests, home addresses, or all family records.

### Access rules versus business rules

**Database access rules:** RLS on every exposed application table, explicit role
grants, safe views/projections, relationship checks, and restricted function
execution determine who can read or change which records. No anonymous application
data access. Circle membership alone never authorizes child management, driver
consent, or viewing exact trip details. Prevent recursive membership policies and
test access using real anon/authenticated identities, including direct Data API use.

**Next.js business boundary:** use Server Components for authorized reads and Server
Actions for web mutations; Route Handlers for Auth callbacks and health only where
needed. Keep shared server services small. Validate shapes and length limits,
verify the actor with Supabase Auth, authorize the requested context, map errors to
useful UI, and revalidate after commits. Do not introduce a parallel REST API for an
unbuilt mobile client. Auth/session clients continue using the public key and the
user's cookies. Server Actions are callable endpoints and must check authorization
on every call; hiding buttons is insufficient.

**Atomic database commands:** identity checks, invitation consumption, final
assignment, consent, capacity, interval conflicts, revisions, and trip transitions
must also be enforced at the transactional write boundary. A client can bypass
Next.js and call Supabase. Revoke direct table writes to protected state and offer
narrow authenticated commands; use constraints and locks for races. Prefer invoker
functions where possible. If controlled writes need definer privileges, keep the
implementation in a non-exposed schema behind a narrow wrapper, fix `search_path`,
schema-qualify references, restrict `EXECUTE`, and explicitly validate `auth.uid()`
and all affected rows inside the privileged routine. Review this as privileged
code, not as an excuse to skip RLS. Never put a service-role key in the normal
session helper. [Supabase's RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
describes policy isolation and the hazards of privileged functions.

Use optimistic revision checks for stale forms and transactional locks/constraints
for concurrent finalization. Duplicate retries must return the existing result or
a clear conflict, without duplicate rides, invitations, approvals, or assignments.
Use database time for deadlines. Return a typed outcome such as `validation`,
`unauthenticated`, `not_found`, `conflict`, or `expired`; hide the existence of rows
the actor cannot access. Never trust submitted actor IDs, approval counts, status,
timestamps, capacity snapshots, or tenant identifiers without validation.

### Read and mutation authority

| Actor | Allowed | Denied |
| --- | --- | --- |
| Signed out | Auth screens; application liveness | Application rows and commands |
| Family guardian | Own child management/enrollment; own children's consent; joined ride details | Another family's child edit/consent; invitation administration without owner/coordinator role |
| Family owner | Guardian invitations/removal for that family | Self-joining another family or giving oneself circle coordinator rights |
| Circle coordinator | Invite/remove families; limited circle roster | Blanket access to every child's records or automatic authority to accept/approve a driver |
| Invited family | Minimal ride offer; accept/decline and enroll own children | Detailed roster/locations before participation; editing creator's plan |
| Proposed driver | Minimal proposal and relevant seat/restraint needs; own acceptance/decline | Exact private pickup notes before confirmation; acceptance for another driver |
| Confirmed driver | Exact assigned trip details; later R6 pickup/arrival reports | Guardian consent or handoff solely because they are driving |
| Unrelated or removed member | No continuing private access | Guessed-ID reads/writes, direct table updates, stale-session membership claims |

Membership removal must take effect on subsequent reads/commands without relying
on stale JWT role claims. R5 extends membership changes to invalidate affected
future assignments in the same transaction. Once R6 introduces active trips,
define removal handling explicitly: deny ordinary membership removal while that
adult/family is responsible for an active trip, rather than silently losing its
receipt workflow. Account deletion and emergency operations need separate design.

## Delivery and validation contract

| Environment | Database/Auth | Configuration and authority |
| --- | --- | --- |
| Developer machine | Existing Supabase CLI containers | Ignored local environment; public browser URL, server-only internal URL in Docker. Never reset the user's existing backend as a test shortcut. |
| PR checks | Disposable local Supabase when schema/Auth tests need it | Fresh test identities and fixture data; no cloud credentials required to run mandatory checks. |
| Hosted preview/test | One separate Supabase test project initially | Test public URL/key only; synthetic data; trusted preview migrations serialized. No production user/data copies. |
| Production | Separate production Supabase project | Production public build/runtime settings; protected release credentials; only reviewed merged migrations. |

R1 should use a small checked workflow with Vercel's remote container build and
registry, not a second registry or deployment platform. The container path and
`Dockerfile.vercel` detection remain supported in the
[Vercel container documentation](https://vercel.com/docs/functions/runtimes/container).
Disable duplicate Git deployments when Actions owns delivery; Vercel documents
[`git.deploymentEnabled`](https://vercel.com/docs/project-configuration/git-configuration).
This is a proposed delivery choice, not a claim about the user's current settings.

Before R3, schema-changing delivery fails closed because no migration executor
exists. R3 adds that executor with the first real schema. The release sequence is:

1. Validate the exact revision: install pinned dependencies, lint, type-check,
   regression tests, production build/container smoke, and then applicable local
   database/Auth/browser tests. Do not build with production credentials.
2. For a trusted PR preview, migrate the hosted **test** project, then deploy that
   tested revision with test public settings, then smoke-test the result. A failing
   migration must prevent deployment. Fork/untrusted PRs run local checks without
   deployment/migration secrets; never execute them via `pull_request_target`.
3. After the user merges, validate the merged `main` revision. Migrate and verify
   test first, then apply the same reviewed migrations to production, then build/
   deploy that revision with production public settings and verify the production
   URL. Serialize releases; never cancel a running migration. Recheck that an older
   queued run cannot overwrite a newer deployment.
4. Treat database migrations as a release step outside container startup/build.
   Use additive, backwards-compatible migrations so the prior app can run during
   rollout and rollback. Never seed or reset a hosted database. Application rollback
   does not roll back SQL; failed migrations halt delivery and need a forward fix.

With one shared hosted test database and one active implementation PR, a trusted
preview can put test schema ahead of `main`. Once applied there, do not rewrite a
migration: use forward corrections. Serialize test migrations; an abandoned PR
needs explicit reconciliation before another schema PR uses test. Local disposable
databases remain the authoritative clean-history test. Do not add a long-lived
`develop` branch or a database per PR for this milestone. Separate projects and
versioned migrations follow [Supabase's environment guidance](https://supabase.com/docs/guides/deployment/managing-environments).

Only public URL/key values are Docker build arguments; `NEXT_PUBLIC_*` values are
frozen into browser assets, so test and production require separate builds.
Migration credentials and Vercel tokens are restricted release secrets, never
browser variables, image layers, Git, documentation values, logs, or normal app
runtime credentials. Keep `.env.local` and prototypes excluded from uploads/builds.

Every PR keeps `npm run check` green under `.nvmrc`, adds only meaningful tests for
its behavior, and extends CI as necessary. R3 onward runs clean migrations, upgrade
from the previous schema, generated-type drift checks, and real RLS/command tests.
Use independent authenticated browser contexts for cross-family flows. Unit tests
alone and admin-client-only database tests are not proof of authorization. Use
admin fixture setup only in an isolated test database; actual assertions use public
key plus user sessions. Keep Auth connectivity checks separate from permission tests.

## Implementation-agent working agreement

Each prompt below incorporates this agreement and its numbered PR specification:

1. Read repository guidance and this roadmap, inspect the actual current state,
   and confirm the predecessor has been merged by the user. Update `main` with a
   fast-forward pull, then create the specified `lkluge/<purpose>` branch from it.
   R1 starts after this roadmap is made available to the implementation checkout;
   merge the documentation first or provide the file explicitly. Do not base work
   on a predecessor's unmerged branch or assume today's SHA is still current.
2. Preserve unrelated work and local references. No parallel implementation agents
   or overlapping PRs. Implement only the assigned scope; record material unknowns
   rather than silently adding product decisions or later features.
3. Implement, validate, inspect the final diff, commit the focused change(s), push,
   and open a PR against `main`. Describe user behavior, schema/policy changes,
   migration compatibility, test results, and any unverified hosted setup. Attach
   the created PR to the Codex chat.
4. Post a focused `@codex review` request on that PR using the focus listed below.
   The assignment authorizes that review request and replies addressing its
   actionable feedback. Fix actionable findings, run relevant checks, push fixes,
   and verify CI/review outcomes. If review is unavailable or inconclusive, report
   that explicitly; do not call it approved.
5. Stop for the user to merge. Do not merge, enable auto-merge, or start the next PR.
   Report required provider setup truthfully; code wiring without a successful
   hosted run is not completed delivery verification.

## R1 — Add automated checks and gated Vercel delivery

**Branch/base/dependencies:** `lkluge/ci-vercel-delivery`, from freshly pulled
`main` after the planning document is available. No application PR prerequisite;
verified foundation is `343f5ab`.

**Outcome and scope:** maintainers get repeatable PR checks and an ordered preview/
production release path for the current landing page. This PR owns CI/delivery only.

**Changes:** add workflows and small smoke helpers using the exact Node version in
`.nvmrc`; run `npm ci` and `npm run check`; build the `linux/amd64` final container
with nonproduction public settings and no database dependency; smoke homepage,
linked CSS, `robots.txt`, and `/api/health`, with no development mounts. Add test/
production configuration validation, trusted-preview and merged-main delivery
gates, release concurrency, and rollback instructions. Use the existing Vercel
container path and disable competing automatic Git deployments if Actions owns it.
Fail on migration files until R3 provides ordered migration execution. No schema,
Auth policy, or frontend feature changes. Update `README.md`/`docs/deployment.md`
with check names, branch-protection setup, environment mapping, and actual setup
status. Provider account creation or spending remains a separate owner action.

**Acceptance and tests:**

- Fresh checkout without local prototypes or `.env.local` passes all 12 regressions,
  lint/type checking/build, container smoke, and Compose validation. Explicitly set
  production `NODE_ENV` when checking inside the development container. Create a
  disposable placeholder environment for Compose validation; do not require the
  developer's real `.env.local` or cloud credentials.
- A failing check prevents release; missing/mismatched target configuration fails
  clearly; test and production cannot resolve to the same Supabase project. Builds
  do not use localhost/Docker backend URLs in hosted configuration.
- Fork/untrusted contexts cannot obtain release secrets or deploy production;
  preview credentials cannot select the production job; only reviewed merged
  `main` can trigger production. No privileged values enter build arguments/logs.
- Exercise workflow guards for failure, wrong branch/target, and migration-file
  rejection. Verify stale queued runs cannot overwrite newer releases.
- When provider access is available, demonstrate one trusted preview and record
  verification of production settings/release behavior using authorized deployment
  operations. Production release of R1 occurs only after the user's merge. If
  external setup is missing, leave exact setup steps and mark hosted verification
  pending rather than claiming success or inventing credentials.

**Exclusions:** application schema/migrations, authentication, UI redesign,
Supabase admin app client, another registry, Kubernetes, native tooling, dependency
upgrades unrelated to this PR. Do not provision paid services implicitly.

**Review focus:** check bypasses, untrusted-code secret exposure, environment mixups,
container fidelity, concurrent release ordering, and false-positive smoke checks.

**Copy-ready implementation prompt:**

```text
Implement only R1, “Add automated checks and gated Vercel delivery,” in /Users/lancekluge/git/pool/docs/development-roadmap.md. Read that file and repository instructions first; follow its implementation-agent working agreement. Verify current state, pull main after the roadmap is available, and create lkluge/ci-vercel-delivery from updated main. Preserve untracked sites/ and exports/.

Add CI using Node from .nvmrc: npm ci, npm run check, Compose validation, and a linux/amd64 production-container smoke test for the homepage, CSS, robots.txt, and /api/health without development mounts. Keep the existing Vercel container path. Add gated trusted previews with separate Supabase test settings and production delivery only from checked, merged main. Use one delivery owner, prevent duplicate Git-triggered deployments, serialize releases, reject stale runs and environment mixups, and deny fork/untrusted jobs access to deployment secrets. Fail closed on schema-changing deployments until R3 adds the migration executor. Keep privileged credentials out of public variables, Git, images, build arguments, and documentation.

Update deployment/setup/rollback documentation and verify the workflow guards. Do not add auth, tables, ride features, visual changes, or unrelated upgrades. Use already authorized provider access where available; document missing setup and distinguish tested automation from pending hosted verification. Do not provision paid services or claim an unrun deployment succeeded.

Validate, commit, push, open and attach a PR against main, and post a focused @codex review request covering CI bypasses, secrets, environment isolation, and release ordering. Address actionable feedback and verify checks. Stop for the user to merge; do not merge or begin R2.
```

## R2 — Add real sign-in and session-aware application shell

**Branch/base/dependencies:** `lkluge/auth-session-flow`, from freshly pulled `main`
after R1 is merged. Hosted login verification needs R1's test project and real mail.

**Outcome and scope:** an adult can sign up, confirm their email, sign in/out,
recover their password, and return to a protected empty application.

**Changes:** add sign-up/sign-in, confirmation/error, recovery/reset, and a protected
`/app` shell. Implement Auth callbacks with validated internal return paths; no
open redirects. Add the Next.js 16 `src/proxy.ts` refresh flow, preserve `pool-auth`
and public/internal URL separation, and separate cookie-writable action/handler
use from Server Component reads. Verify identity using official Auth APIs, not
unverified cookie/session contents. Avoid shared caching of personalized content
or `Set-Cookie` responses. Configure/document local, test, production callback
origins and mail templates. This follows the
[Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
Application domain tables/RLS are intentionally absent in this PR.

**Acceptance and tests:**

- Real local Auth flow through captured mail: unconfirmed user cannot access app;
  confirmed user can; refresh persists session; sign-out removes access; expired
  recovery/confirmation link shows a useful error and cannot be reused.
- Test absent, malformed, expired, and forged sessions; direct protected requests;
  external/protocol-relative return URLs; refresh cookie propagation; no cached
  content leaking between users. Health/static assets still work without Auth.
- Extend the actual-helper tests, preserving public-key and internal-URL coverage.
  Add browser smoke against disposable local Supabase to mandatory CI, including
  two browser sessions and recovery. Do not mock the entire login round trip.
- Verify a hosted test email/callback/refresh cycle once SMTP and origins are
  configured. No production emails are sent by automated tests.

**Exclusions:** families, circles, invitations to groups, children, OAuth, native
auth, custom identity provider, child accounts, ride screens, or privileged clients.

**Review focus:** identity verification, cookie refresh, callback/recovery handling,
redirect validation, and cross-user cache isolation.

**Copy-ready implementation prompt:**

```text
Implement only R2, “Add real sign-in and session-aware application shell,” from docs/development-roadmap.md in /Users/lancekluge/git/pool. Read repository instructions, the R2 specification, and the shared working agreement. After R1 is merged, pull main and create lkluge/auth-session-flow. Preserve local prototypes.

Implement email/password signup, confirmation, sign-in/out, recovery/reset, and a protected empty /app shell using existing Supabase public-key clients. Add the Next.js 16 SSR refresh proxy and cookie-safe Server Component/action handling, retaining pool-auth and Docker/internal URL support. Validate identity and return paths, prevent personalized response caching, and document local/test/production mail and redirect configuration. Add actual Auth browser tests plus focused helper regressions, including denied/forged/expired sessions and cross-user isolation. Follow R2's acceptance criteria and record hosted verification limits.

Do not add application tables, family/group workflows, ride features, OAuth, native work, or a service-role session client. Validate, commit, push, open and attach a PR, request focused @codex review of sessions, redirects, recovery, and cache isolation, address actionable feedback, and stop for the user's merge. Do not start R3.
```

## R3 — Add families, circles, and secure membership invitations

**Branch/base/dependencies:** `lkluge/family-circle-membership`, from freshly pulled
`main` after R2 is merged. This is the first application schema PR.

**Outcome and scope:** a signed-in adult creates a family and a circle, invites a
guardian to their family or another family to the circle, and sees real membership.

**Changes:** introduce only the R3 schema above, RLS/limited profile projections,
types, and authenticated commands for `createFamily`, `createCircle`,
`createInvitation`, `acceptInvitation`, `revokeInvitation`, and membership removal.
Bootstrap owner membership transactionally without a general self-promotion path.
Family owner/coordinator identity must be a valid active member in the corresponding
context. The accepting verified-email adult chooses an authorized family for circle
membership, or creates one; accepting a circle invite never joins the inviter's
family. Consumption, membership insertion, and replay protection are atomic.

Use high-entropy opaque invitation tokens with stored digests, scoped targets,
seven-day expiry, revocation, and single use. No mutation on a GET link visit;
require sign-in and explicit acceptance. Do not log tokens or return invitation
email lists to ordinary members. Copy/share-link UI is real invitation capability;
label delivery as manual. Add family creation/membership, circle selection/roster,
invite acceptance, expired/wrong-account, and revoke/remove screens.

Add disposable database test setup, clean/upgrade migration tests, generated types,
and a separate permission-test command. Extend R1 with the first real ordered
migration executor for test/production, using the shared delivery contract; this
is necessary to deploy these tables, not a generic platform expansion.

**Acceptance and tests:**

- Two accounts in separate families join the same circle using a real link;
  another guardian joins the correct family. Reload preserves membership. No
  invitation grants driver approval. Nonmembers cannot enumerate the circle.
- Deny anonymous/self-inserted membership, spoofed family/owner/role, another
  family's invitation administration, wrong verified email, expired/revoked token,
  and cross-scope use. Two simultaneous acceptances create one membership; a retry
  returns an appropriate consumed/already-member result. Protect the last owner.
- Verify direct Data API/RPC access, safe profile projection, nonrecursive RLS,
  hidden token hashes, and immediate removal of a former member's private access.
- Migrate from empty and R2 baseline; migration failure prevents deployment; local
  test reset cannot target hosted projects; no demo data or reset in cloud release.

**Exclusions:** children, ride tables, driver approval, email invitation delivery,
organization hierarchy, custody modeling, general admin dashboard, notifications.

**Review focus:** bootstrap/escalation paths, invitation races/leaks, RLS recursion,
family-versus-circle scope, and migration-before-app ordering.

**Copy-ready implementation prompt:**

```text
Implement only R3, “Add families, circles, and secure membership invitations,” in /Users/lancekluge/git/pool/docs/development-roadmap.md. Follow repository instructions and the shared working agreement. After R2 merges, pull main and branch lkluge/family-circle-membership.

Add the scoped membership/profile/invitation schema, generated types, RLS, transactional bootstrap and invitation commands, and usable family/circle/invite screens. Separate guardian invitations from circle-family invitations. Use verified-email-bound, expiring, revocable, single-use tokens stored as digests; provide copyable links for manual delivery. Prevent self-promotion, arbitrary membership insertion, token disclosure, and accepting on behalf of another family. Implement removal and last-owner protection as specified.

Add disposable local database/RLS tests and migration/type checks. Extend R1 delivery so reviewed migrations run before dependent app deployment, with test/production isolation, no hosted reset/seed, and failure stopping release. Exercise direct anonymous/user Data API and RPC denial cases, concurrent acceptance, removal, and clean/upgrade migrations. Do not add children, rides, driver approvals, or automatic invitation emails.

Validate, commit, push, open and attach a PR, request @codex review focused on membership escalation, invitation authority/races, RLS, and migration ordering, address actionable feedback, and stop for the user's merge. Do not start R4.
```

## R4 — Add persisted ride planning and family rider enrollment

**Branch/base/dependencies:** `lkluge/ride-planning`, from freshly pulled `main`
after R3 is merged.

**Outcome and scope:** a family plans a real ride and other invited families enroll
their own children. Schedule and detail screens reflect durable shared data;
every ride honestly says it still needs a driver.

**Changes:** introduce R4 tables/policies/types. A creator must be a circle member
and participating guardian; creation includes at least one of their own children.
Choose other families from the circle, not their private child records. Each
invited guardian joins/declines and selects their own children. Store explicit
pickup/destination, time interval, timezone, family participation, and minimal
ride-specific child/seat information. Do not require birthdays or geocoding.

Commands: `saveOwnChild`, `createRide`, `respondToRideInvitation`,
`setOwnRideRiders`, `cancelRide`; reads: authorized schedule/date range and ride
detail. A parent may remove their own enrollment before confirmation; creator may
cancel the whole scheduled ride. General edit/reorder/recurrence is deferred.
Validate all child-family-circle links in the database and reject stale revisions.
Add child setup, plan form, own-family enrollment, weekly list covering all
directions, details, and attention items for pending family responses/uncovered rides.
UI uses actual dates/timezones and persists across independent browser sessions.

**Acceptance and tests:**

- Create with separate pickup/drop-off; second family joins with its own child;
  both see one saved ride after reload; cancellation is durable and visible.
  Handle empty week, invalid dates/intervals, duplicate submission, and backend
  failure without fake success. Verify timezone boundaries and DST input handling.
- No guardian can create/enroll/edit another family's child or add a nonmember
  family. Circle coordinator without participation cannot read private ride data.
  Invited-but-not-joined family sees only its limited offer. Unrelated/removed
  users and anonymous requests are denied through UI endpoints and direct APIs.
- Exact location table and child base table remain protected even if queried
  directly. Repeated enrollment cannot duplicate a child; concurrent stale
  roster changes produce a clear conflict. Cancellation cannot be undone by a retry.
- Migration upgrade/reset/type checks and multi-user browser flow pass in CI.

**Exclusions:** assignment fields writable by clients, driver selection/acceptance,
vehicles, approvals, actual trip progress, maps, recurrence, multi-stop routing,
notifications, and visual parity. Keep driver actions absent until R5.

**Review focus:** cross-family enrollment, summary/detail privacy, input validation,
date/time correctness, duplicate creation, and unauthorized cancellation.

**Copy-ready implementation prompt:**

```text
Implement only R4, “Add persisted ride planning and family rider enrollment,” from docs/development-roadmap.md in /Users/lancekluge/git/pool. Follow repository instructions and the shared working agreement. After R3 merges, pull main and create lkluge/ride-planning.

Add the R4 schema, RLS and generated types, children owned by families, explicit pickup/destination and timezone-aware ride intervals, invited/joined families, and deduplicated child enrollment. A creator selects their own children and invites other families; each guardian selects only their own children. Implement scoped server commands and usable child setup, create-ride, invitation/enrollment, weekly schedule, detail, cancellation, and attention screens. Rides remain unassigned. Enforce relationship checks and stale-write handling in the database; keep base child records and exact locations out of broad circle access.

Validate persistence across browser sessions, clean/upgrade migrations, timezone boundaries, duplicate/racing writes, cancellation, and denied cross-family/direct Data API access. Do not add driver workflows, vehicles, trip progress, maps, recurrence, notifications, or design parity.

Commit, push, open and attach the PR; request focused @codex review of enrollment authority, privacy, dates, and write conflicts; address actionable feedback and stop for the user's merge. Do not start R5.
```

## R5 — Add driver acceptance, child consent, and capacity enforcement

**Branch/base/dependencies:** `lkluge/driver-confirmation`, from freshly pulled
`main` after R4 is merged. **Completes M1.**

**Outcome and scope:** a participating guardian nominates an eligible circle adult
(including themselves); that driver accepts with a real vehicle and restraint
acknowledgment; each child's family consents; the ride acquires one confirmed driver.

**Changes:** add R5 schema, policies/types, driver-owned vehicle setup, and commands
`proposeDriver`, `acceptDriverProposal`, `consentForOwnChildren`,
`declineDriverProposal`, `cancelDriverProposal`, `withdrawDriver`, and
`revokeOwnConsent`. A proposal for initial assignment is allowed only when no
active driver exists, after all included families have responded and roster is
frozen. A declined family contributes no riders; a pending family response blocks
finalization. One pending proposal per ride; default deadline is scheduled pickup.

Driver acceptance and parental consent are independent, even when an adult has
both roles. Each consent binds to this proposal, enrolled children, ride revision,
driver, and vehicle version. Nomination selects one of that driver's registered
vehicles, so the proposal is complete before either party responds. Choosing a
different vehicle requires a fresh proposal. Driver confirms available passenger
seats and required restraints. In one transaction, the last necessary reply rechecks live membership,
all child consents, vehicle ownership/version/capacity, future deadline, and driver/
vehicle interval conflicts; it either creates one active assignment or leaves the
ride unconfirmed with a useful explanation. Enforce interval conflicts even when
different rides finalize concurrently. Do not use an in-memory count then insert.

Decline/cancel/expiry leave the initial ride unassigned. Withdrawal, revoked
consent, or removal of necessary membership invalidates future assignment and
leaves an explicit need for a driver; no old consent is reused for the next
proposal. Whole-ride cancellation closes pending proposals and releases assignment
reservations in the same transaction. Reject vehicle deletion/capacity changes used by a live proposal or
assignment until the user resolves it. Lock plan/roster changes during proposal or
confirmation; cancelling/reopening uses a new revision and fresh consent.

Coverage is derived as `needs_driver`, `awaiting_confirmation`, or `confirmed`,
separate from cancellation and later trip progress. Expiry uses database time on
every command and effective status on reads, so a scheduler is unnecessary for
correctness. A proposed driver's limited projection does not expose exact private
pickup notes. Add driver/vehicle setup, nomination, own acceptance, family consent,
decline/withdraw, assignment summary and attention screens. Refresh/revalidation
is sufficient; there is no promise of background delivery.

**Acceptance and tests:**

- Demonstrate the complete M1 script in independent browser contexts and hosted
  test. All families see the same confirmed driver after refreshing. One missing
  family consent or driver acceptance always prevents confirmation.
- Deny acceptance for another driver, consent for another family's child, expired
  replies, non-circle drivers, unowned vehicles, missing restraint acknowledgment,
  insufficient seats, invalid seat counts, and direct assignment/status writes.
- Concurrent claims/final approvals for one ride yield one assignment. Concurrent
  overlapping rides cannot reserve the same driver/vehicle. Duplicate approvals
  do not count twice. Stale proposal/vehicle/roster revisions cannot finalize.
- Withdrawal/revocation/membership removal clear future coverage; retries cannot
  restore it. Cancellation frees reservations without allowing a pending reply to
  assign the cancelled ride. Unrelated circle members and proposed-only drivers cannot read exact
  trip locations. Ordinary server clients still use public keys/user sessions.
- Existing Auth/membership/planning flows, migrations, RLS tests, and container
  release checks stay green; no sample families or simulated approvals in app UI.

**Exclusions:** optional swaps while a driver is assigned (R7), trip start/pickup/
handoff (R6), standing driver trust lists, background checks, availability ranking,
GPS, notifications, calendar integration, native work, and visual parity.

**Review focus:** consent authority, direct API bypasses, atomic seat/time checks,
concurrent confirmation, invalidation, and misleading coverage states.

**Copy-ready implementation prompt:**

```text
Implement only R5, “Add driver acceptance, child consent, and capacity enforcement,” from docs/development-roadmap.md in /Users/lancekluge/git/pool. Follow repository instructions and the shared working agreement. After R4 merges, pull main and create lkluge/driver-confirmation.

Implement scoped driver/vehicle setup, initial-driver proposals, real driver acceptance, per-child guardian consent, and atomic confirmed assignment with the R5 schema and UI. Require a fixed responded roster, current memberships, valid consent for every child, owned vehicle, sufficient passenger seats, restraint acknowledgment, deadline, and no overlapping driver/vehicle reservation. Enforce these at the database command boundary as well as the server. Handle duplicates, concurrent finalization, stale revisions, decline, expiry, withdrawal, revoked consent, and membership removal without false coverage or reused consent. Keep proposed-driver data minimal until confirmation and retain public-key session clients.

Exercise the full M1 flow across independent accounts and all R5 denial/race cases, plus migrations, RLS, CI and hosted-test acceptance. Do not add replacement swaps, trip events/handoffs, GPS, notifications, calendar, native work, or visual parity.

Validate, commit, push, open and attach the PR, request focused @codex review of consent authority, atomic assignment/capacity/conflicts and invalidation, address actionable feedback, and stop for the user's merge. Do not start R6.
```

## R6 — Add pickup, arrival, and child handoff confirmation

**Branch/base/dependencies:** `lkluge/ride-handoffs`, from freshly pulled `main`
after R5 is merged. This is beyond M1; resolve recipient authority first.

**Outcome and scope:** the assigned driver records pickup and arrival; each child's
designated guardian confirms receipt. Everyone sees who reported each event and
when, with honest in-progress versus completed state.

**Changes:** add R6 event/progress schema and policies/types. Before starting,
revalidate assignment, live membership, consents, roster, capacity, and a valid
designated guardian recipient for each child. Freeze that plan. Driver-only
`recordPickup` moves a rider from `scheduled` to `picked_up`; driver-only
`reportArrival` moves that rider to `awaiting_handoff`; only the authorized
recipient's explicit `confirmHandoff` moves it to `completed`. No skip/backward
transitions. Parent receipt is not a driver arrival flag. One child's completion
does not complete the others; the ride completes only after all enrolled riders.
Do not auto-complete from time, map position, or location updates.

Add an append-only event trail with trusted actor/time and atomic state changes,
receipt actions, driver trip controls, family status/attention screens, and a scoped
activity view. Treat duplicate event requests idempotently. Pre-pickup cancellation
is allowed; cancel/reassign/roster changes after the first pickup are outside this
ordinary workflow and must be rejected rather than orphaning riders. Specify the
active-trip membership-removal guard from the shared contract. Absent children are
removed/replanned before start; no-show/incident handling is separate work.

**Acceptance and tests:**

- Two-child trip: pickup, arrival persists across reload as handoff needed, first
  child's receipt completes only that child, second receipt completes ride.
  Closing a dialog changes nothing. Events show the real actor and stored time.
- Deny unassigned driver's pickup/arrival, unrelated guardian receipt, ordinary
  driver receipt without recipient authority, receipt before arrival, updates after
  completion, direct event fabrication, and unauthorized event-history reads.
- Parallel/repeated receipts yield one completion event; late updates cannot reopen
  a child. Prevent start with invalidated consent/membership or no recipient.
  Test membership-removal/cancellation guards once pickups exist.
- Functional mobile/keyboard controls, database transition tests, multi-user browser
  flow, and migration/type checks pass. Current status is manually reported, never
  labeled live GPS or guaranteed arrival information.

**Exclusions:** location sharing/maps/ETA, external recipients, emergency response,
automatic reminders, push/SMS, route optimization, replacement during an active trip.

**Review focus:** actor/recipient authority, per-child terminal states, atomic events,
active-trip consistency, and unsafe automatic completion assumptions.

**Copy-ready implementation prompt:**

```text
Implement only R6, “Add pickup, arrival, and child handoff confirmation,” from docs/development-roadmap.md in /Users/lancekluge/git/pool. Follow repository instructions and the shared working agreement. After R5 merges, pull main and create lkluge/ride-handoffs. Resolve the documented recipient-role decision before encoding it.

Add per-child scheduled/picked-up/awaiting-handoff/completed transitions, designated guardian recipients, append-only actor/time events, and usable driver/family/activity screens. Revalidate the confirmed plan before pickup. Only the assigned driver reports pickup/arrival; only an authorized recipient explicitly confirms receipt. Persist arrival separately, complete each child independently, and finish the ride only when all children finish. Enforce atomic/idempotent transitions and prevent plan/removal/cancellation changes from orphaning an active trip.

Test multi-child persistence, duplicate and competing receipts, premature/unauthorized transitions, direct API bypasses, and terminal-state protection with real user sessions. Do not add GPS, ETA, external recipients, notifications, emergencies, or active-trip driver replacement. Validate, commit, push, open and attach a PR, request focused @codex review of recipient authority and state/event consistency, address actionable feedback, and stop for the user's merge. Do not start R7.
```

## R7 — Add replacement requests and family approvals

**Branch/base/dependencies:** `lkluge/driver-replacements`, from freshly pulled
`main` after R6 is merged. **Completes M2** for planned rides and ordinary handoffs.

**Outcome and scope:** a scheduled ride can propose a replacement without falsely
retaining an unavailable driver or assigning someone without all required replies.

**Changes:** extend R5 proposals with optional-swap/unavailable-replacement modes,
old assignment/version, and explicit review deadline no later than pickup. Reuse
R5's driver acceptance, per-child consent and seat/conflict commands. Nomination
is manual from circle adults; no invented matching/availability algorithm.

An optional swap preserves the available current assignment while awaiting fresh
replacement consent. If that driver withdraws, clear the assignment immediately,
invalidate the old request, and require a fresh unavailable-replacement request.
This follows v3's reset-on-unavailable behavior. Cancellation/decline/expiry of an
optional swap preserves its available original; those outcomes for an uncovered
ride leave it uncovered. Commit replacement exactly once only when the candidate
and all distinct affected families have consented for every enrolled child.
Swap old/new reservations and assignment atomically, including conflict checks.

Commands include `requestReplacement`, `respondToReplacement`, and
`cancelReplacement`; reuse consent commands rather than creating two authorities.
Expiry is enforced by database time regardless of browser clock; reads show expired
requests even without a background job. A late response cannot resurrect a closed
request. Plan/vehicle/roster changes invalidate its approvals. No changes once any
pickup is recorded. Add review screen, own-family action, driver inbox, effective
deadline/remaining replies, honest attention states, and event history.

**Acceptance and tests:**

- Translate all relevant v3 replacement scenarios into authenticated database/
  browser tests, replacing fixed family names with actual participant sets.
- Optional swap retains current available driver until final consent; unavailable
  ride remains uncovered after partial/duplicate approvals, cancellation, decline,
  or expiry; new request starts with no inherited acceptance/consent.
- Deny another family's approval, impersonated candidate acceptance, forged
  deadline/clock, stale request reply, concurrent competing replacement, and
  replacement after pickup. Last approval racing withdrawal or expiry cannot
  produce a false assignment. Retest capacity and overlapping reservations.
- Reload/other browser shows identical persisted outcomes. No UI can simulate
  another actor's response or claim that a notification was delivered.

**Exclusions:** automatic suggestions, live availability, replacements mid-journey,
external notifications, background scheduler merely for display freshness,
calendar/GPS/native work, and visual parity.

**Review focus:** distinction between swap/unavailable, deadline races, complete
consent sets, stale responses, and atomic replacement of reservations.

**Copy-ready implementation prompt:**

```text
Implement only R7, “Add replacement requests and family approvals,” from docs/development-roadmap.md in /Users/lancekluge/git/pool. Follow repository instructions and the shared working agreement. After R6 merges, pull main and create lkluge/driver-replacements.

Extend existing proposals/consents with optional swaps, unavailable-driver replacements, old-assignment revision and database-enforced deadlines. Reuse the existing assignment/capacity/conflict transaction. Available original drivers remain assigned during optional swaps; unavailable drivers are cleared immediately and require a fresh request. Cancellation, decline, expiry, missing replies, or duplicate approvals never cover an uncovered ride. Only actual candidate acceptance and consent for all affected children can atomically confirm a replacement. Reject stale replies and all changes after pickup.

Implement real review/driver/attention screens and history. Cover the prototype scenarios with authenticated database/browser tests, including deadline/withdrawal/final-approval races and direct unauthorized calls. Do not add simulated approvals, automatic matching, notifications, GPS, calendar, native features, or visual parity. Validate, commit, push, open and attach the PR, request focused @codex review of replacement semantics, authority and races, address actionable feedback, and stop for the user's merge. Do not start R8.
```

## R8 — Match Pool v3 with real workflows

**Branch/base/dependencies:** continue PR #10 on `lkluge/web-visual-parity`,
stacked on R7. Fetch and inspect remote state before editing. Do not create a new
branch/PR, rewrite history, merge, deploy or release.

**Outcome and scope:** correct the earlier simplification to closely match
`exports/pool-v3.html`. Its matching v3 distribution, design notes and behavioral
tests clarify the intended rendering and interactions. The original prototype is
secondary historical context. System typography, removed navigation, sparse cards
and expandable primary workflows are no longer intentional design choices.

**Changes:** reproduce DM Sans/Manrope, sage/lime/green/amber palette, sidebar,
top bar, persistent mobile navigation, widths, density, route/date/avatar cards,
status pills and focused action dialogs. Apply consistently to authentication,
onboarding, families, circles, children, vehicles, scheduling, driver acceptance,
family consent, replacements and independent child handoffs. Preserve real saved
records, the full week and both directions, all authorization and mutation
contracts. An available original driver stays assigned during an optional swap;
an unavailable ride stays uncovered until actual acceptance and every consent.
Arrival awaits receipt, independently for every child.

**Acceptance and tests:**

- Capture and inspect v3, before and after at matching desktop and phone sizes;
  use the same persisted application records without mutations/reset/reseeding.
  Keep the references unchanged. Record concrete differences in
  `docs/v3-parity-checklist.md` and decisions/evidence in `docs/visual-parity.md`.
- Fix visible mismatches; tests alone do not establish fidelity. Verify 320px
  reflow, contrast, keyboard interaction, modal focus restoration and saved/error
  visibility. Test uncovered, pending, confirmed, replacement, declined, expired,
  cancelled, awaiting-receipt and completed states.
- Run multi-user journeys, public-key authorization checks and relevant builds
  and tests. Review the full PR diff, commit/push, update the existing description,
  request focused `@codex review`, address findings and verify final checks.
- Leave the app available for the user's inspection. Production remains limited
  to validated, protected, PR-merged current `main`.

**Necessary deviations:** no prototype browser storage, sample identities/clocks,
simulated approvals, standing consent, maps/GPS/ETA, contact or notification
controls. Exact trip details stay authorized; original and candidate vehicles must
be distinguished even when the current projection omits the original snapshot.
The real route, time, capacity and per-child consent fields can require more
space than the prototype's single-child demonstration.

**Review focus:** fidelity to v3, accessible interactions, honest status and
capability copy, real workflows and authorization regressions.

**Copy-ready implementation prompt:**

```text
Correct Pool's frontend to closely match exports/pool-v3.html in /Users/lancekluge/git/pool. Continue existing PR #10 and lkluge/web-visual-parity after fetching the latest remote state. This supersedes original-first/Apple-inspired simplification. Follow the current R8 scope, preserve supplied references and existing accounts/demo records, render v3 and the app at identical viewports before editing, and document a short parity checklist.

Use the v3 distribution, design notes and tests to clarify fonts and interactions. Correct the shell, typography, colors, spacing, cards, navigation and dialogs consistently across all real workflows. Preserve backend/schema/API/RPC/authorization and explicit acceptance, family consent, replacement coverage and independent child receipt. Never import prototype storage, simulations or unsupported capabilities.

Compare v3/before/after screenshots, fix obvious visual mismatches, check desktop/phone/320px accessibility and save/error visibility, and run the existing multi-user/authorization/build tests. Review the full diff, commit/push to the same PR, update its scope/evidence/deviations/actual validation, request focused @codex review, fix actionable findings and verify final checks. Leave the local app available and stop for user review. Do not merge, deploy or release.
```

## Deliberately outside this chain

Live GPS, maps/ETA, push/SMS and event emails, calendar integration, recurring ride
generation, automatic driver matching, multi-stop/multi-vehicle optimization,
cross-household custody, external handoff recipients, advanced incident handling,
and native React Native/Expo work need separate decisions and focused assignments.
Do not create placeholder services or tables for them now. Auth mail is the sole
required delivered-message capability in M1; in-app persisted attention lists do
not imply notification delivery.
