# Expo migration acceptance record

PR #10 replaces the Next.js frontend with one Expo/React Native application for
responsive web and iOS. PRs #3–#9 and all existing Supabase migrations, RLS and RPC
contracts are preserved. PR #11 is a separate prototype and is not incorporated.

## Baseline and layout contract

The pre-migration revision is recorded in `baseline.json` with its routes,
commands, states and target viewports. Before replacement, the original **12 web
journeys** and clean/upgrade/database authorization checks passed in an independent
checkout using its own disposable Supabase project. Captures are in `baseline/`;
the original v3 comparison artifacts remain unchanged elsewhere in `docs/`.

Mobile is the primary interaction target: persistent phone navigation, touchable
labels, safe areas, keyboard avoidance, native selection/date controls and
explicit action outcomes. Desktop retains the sidebar/top bar, bounded content,
multi-column cards, route details, seven-day schedule and keyboard/browser
navigation. Shared React Native styles drive responsive composition. Small web
adapters retain native browser date/select controls, focus management and links.
There is no WebView or separate product implementation.

New destinations reset the shared content scroller, while refetches retain the
current form position. Native detail screens expose an explicit back action and
headers can grow with larger text. Cross-platform journeys use the visible refresh
control when another participant has changed a ride.

`after/` contains screenshots from the migrated real-user journeys. Compare only
matching named states and viewports; independently created disposable records
have different fictional participants/identifiers. No existing developer records
were reset or seeded for these captures.

Open `comparison.html` through a local static server to compare all 14 named
screens at desktop and phone sizes. The original [v3 checklist](../v3-parity-checklist.md)
remains the visual contract; its older evidence is preserved.

## Validation recorded on October 28, 2026

- Lint, TypeScript, **64 unit tests** and **6 shared native component tests** passed.
- Web and Hermes iOS JavaScript exports passed. The production Linux container
  smoke and Compose validation passed.
- Expo's dependency compatibility check passes with React Native 0.88.0 and
  TypeScript 6.0.3; iOS prebuild generates the project successfully.
- All **13 browser journeys** passed across application and focused Auth runs
  against fresh disposable backends. The final session run verifies the explicit
  sign-out/guard redirect race correction. A further focused layout pass checked
  the final planning composition, navigation, keyboard
  dialogs, focus restoration, saved outcomes and axe accessibility at desktop,
  phone and 320px widths.
- Clean and upgrade schemas, generated types, authorization/privacy, capacity,
  restraints, stale revisions, deadlines, concurrent commands and transactional
  release ordering passed. No Supabase migration or generated database type changed.
- **Native build, simulator journeys, VoiceOver and large-text acceptance remain
  pending** the full Xcode/runtime prerequisite. Native component tests and bundle
  export do not satisfy those acceptance items.

| Inventory                                                                     | Web evidence                                         | iOS status                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Signup, confirmation, sign-in/out, recovery/reset, sessions and PKCE callback | `session.spec.mjs`                                   | Bundle/components pass; simulator pending                                    |
| Families, guardians, circles, fragment invites, preview/accept/revoke/removal | `membership.spec.mjs`                                | Cross-platform journey scripted; simulator pending                           |
| Children, seats, ride creation/enrollment/cancel, schedule and DST            | `rides.spec.mjs`, command/time tests                 | Cross-platform journey scripted; simulator pending                           |
| Vehicles, nomination, independent acceptance and own-child consent/revocation | `drivers.spec.mjs`                                   | Cross-platform journey scripted; simulator pending                           |
| Optional/unavailable replacements, declined/expired/cancelled states          | `replacements.spec.mjs`                              | Optional cross-platform journey scripted; remaining native inventory pending |
| Pickup, arrival, independent per-child receipt and immutable history          | `handoffs.spec.mjs`                                  | Cross-platform journey scripted; simulator pending                           |
| Layout, keyboard, direct routes, errors/drafts and saved results              | `presentation.spec.mjs`, shared component/HTTP tests | Smoke scripted; full native inventory pending                                |

This is an implementation and web verification record, not a declaration of full
cross-platform acceptance. No inventory omissions have been accepted as scope changes.

## Shared behavior

Queries use account-scoped caches, clearing on account changes and refreshing on
foreground/reconnect or explicit request. Panel refresh retains its mounted
controls so a saved replacement cannot close the review dialog or erase its
outcome. Writes remain explicit, do not queue offline, and do not automatically
retry. Request UUIDs remain stable through retries; revisions remain current.

Typed command services preserve existing validation, safe error messages and
transactional Supabase RPCs. Driver acceptance never supplies child consent;
arrival never supplies guardian receipt. Optional swaps preserve available
originals; unavailable replacements remain uncovered until all real replies save.
Capacity, restraints, deadlines, reservations, current memberships, stale versions,
active-trip freezes and completed history remain database-enforced.

## Verification commands

```sh
npm run check
npm run test:auth
npm run test:db
bash scripts/validate-compose.sh
bash scripts/container-smoke.sh
npm run test:ios
```

The default browser/database harness owns temporary projects on 55320–55329 and
cleans up only its own resources. `--watch-browser` is an optional local debugging
mode that retains that same disposable project between rebuilds; enter `q` to
clean it up. It never targets the developer's `pool` project or hosted Supabase.

Browser replay assertions capture the actual mutation RPC and replay it with a
different real user's token. They do not retain Next.js Server Action wire-format
assumptions. Session tests cover browser storage, token rotation, separate users,
recovery, invalid/expired sessions, email links and PKCE. Shared component tests
cover retained drafts, explicit consent and native secure-storage behavior.

## Native verification

`npm run build:ios` compiles the shared Hermes JavaScript bundle. Full simulator
acceptance additionally needs macOS, **Xcode 26.4+**, an installed iPhone runtime,
CocoaPods, Playwright Chromium and Maestro:

```sh
brew install mobile-dev-inc/tap/maestro
npm run test:ios
```

The native runner generates the ignored iOS project, builds an unsigned Release
Simulator app and runs the UI smoke. It builds only the selected simulator
architecture and boots the simulator after compilation, avoiding a second unused
architecture and simulator CPU load during the build. Cold CI builds have a
45-minute budget. The full harness then exercises a native
adult and an independent browser participant: real captured-mail signup, session
restart, family/circle/child/vehicle setup, manual invitation, ride enrollment,
separate acceptance and fresh child consent, an optional replacement, per-child
arrival and independent receipt. UI mutations use Maestro or Playwright; a
public-key observer only reads persisted results.

CI retains Maestro screenshots/hierarchies and simulator application logs for
failed smoke runs. Its native dependency/build cache is scoped to the toolchain,
architecture and configuration inputs; each run still bundles the current source
and executes the required smoke. Release delivery never consumes this cache.

This machine initially has Command Line Tools selected and no `simctl`; no local
simulator, VoiceOver or native UI acceptance is claimed without that prerequisite.
The macOS CI job builds and launches the simulator smoke; it does not substitute
for the local full-backend native journeys. No Apple signing, physical-device
release, universal links, Android acceptance or TestFlight distribution is included.

## Web startup measurements

`performance.json` records fresh-context Chromium measurements on matching
production builds, routes and viewport sizes. Reproduce with the preserved
baseline served on one port and the Expo export on another:

```sh
node scripts/measure-web.mjs http://localhost:3002 http://localhost:3003
```

The Expo web target is client rendered, so public routes lose the old server's
immediate HTML paint and carry the React Native Web/router runtime. Compression,
route splitting, browser font-display swap and a web-specific navigation shell
reduce that cost. These loopback measurements are not mobile-network benchmarks
or evidence of equal loading performance. Rendering/layout and genuine saved
workflow outcomes remain separate acceptance checks.

Medians across the captured route/viewport samples:

| Measurement                 | Next.js baseline | Expo web |
| --------------------------- | ---------------: | -------: |
| Visible screen ready        |            54 ms |   424 ms |
| First contentful paint      |            40 ms |   432 ms |
| Encoded script bytes        |          135 KiB |  442 KiB |
| Signup → sign-in navigation |            90 ms |   367 ms |

This is a material startup/navigation regression relative to server-rendered
Next.js. Investigation identified the client-rendered shell and larger shared
runtime; compression, route chunks, font swapping and the web-only router outlet
are applied. Remaining startup cost is explicit review evidence, not a claim of
performance parity or measured performance on a real mobile network.

## Delivery and compatibility

The Vercel container still serves port 3000 and uncached `/api/health` liveness
JSON. Expo assets are compressed and immutable; app/auth HTML remains private and
no-store. Missing assets return 404 rather than the app shell. Existing Actions
trust, protected-main, environment and migration ordering gates remain enforced;
`checks` aggregates `web` and `ios`, and delivery requires all three exact jobs.

Existing accounts and schema need no migration. Old Next.js browser sessions
require signing in again. Rename local/deployment public settings to
`EXPO_PUBLIC_SUPABASE_*`; secrets never belong in client settings. Native projects,
exports and caches are ignored; the original `sites/` and `exports/` references
are preserved.
