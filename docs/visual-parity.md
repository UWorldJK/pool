# R8 — Pool v3 parity correction

PR [#10](https://github.com/UWorldJK/pool/pull/10) continues on
`lkluge/web-visual-parity`, stacked on R7 `0bab9a3`. This corrects the
original-first/system-font simplification; it is not a new design direction.
Production remains restricted to validated, protected, PR-merged current `main`.
No schema, API, RPC, authorization, server-action or release-policy changes.

## Reference authority

`exports/pool-v3.html` is the visual source of truth. The matching
`sites/pool-prototype-v3/dist`, `DESIGN-NOTES.md` and six behavioral tests clarify
rendering and interactions. The standalone export's malformed initial font import
is preserved; the distribution establishes the intended DM Sans/Manrope rendering.
All 90 supplied reference files were checksum-verified unchanged. The original
`sites/pool-prototype/dist` is secondary historical context.

Before editing, the export, distribution and application at `96fe52c` were
rendered and inspected at **1440×1000** and **390×844**. The
[short parity checklist](v3-parity-checklist.md) records concrete differences.
The local backend was started normally from its preserved volumes. Accounts,
families and demo rides were neither reset, reseeded nor mutated for comparison.

## Corrected presentation and interactions

- Locally served DM Sans body type and Manrope headings, v3 font weights,
  sage canvas/sidebar, lime selected navigation, green/amber status pills,
  232px sidebar, 85px desktop top bar, content insets and 15px cards.
- Persistent phone navigation follows the four v3 destinations. Today maps to
  the real attention queue; Driving maps to the implemented driver inbox/history.
  Family setup, children, vehicles and invitations remain directly reachable.
  The menu supplies the full navigation on phones; account and sign-out are in
  the top bar. Circle context uses persisted membership, with a generic label
  when multiple circles exist.
- Today leads with a real unfinished trip, actual driver and independent handoff
  responsibility. The prototype map area becomes a saved-status/responsibility
  panel. Attention tasks and upcoming confirmed rides use their actual records.
- Schedule restores seven v3-style date tiles and two-column route cards with
  date tiles, route markers, avatars, real pickup/end times, current driver,
  explicit coverage and pending acceptance/child-consent totals. All days and
  both directions remain visible; the current day is highlighted without
  pretending that a time in the past proves completion.
- Ride details keep authorized pickup/drop-off, actual assignment, candidate
  identity, registered/offered seats, restraints and consent totals visible.
  A clear primary link brings active handoffs into view. Each child's status,
  recipient and explicit saved report remain independent and stable in order.
- Setup cards and avatars extend v3 to real families, guardians, circles,
  children and vehicles. Focused native dialogs handle create/edit/invite,
  replacement review and week/timezone choice. Closing a dialog submits nothing.
  Keyboard trapping, Escape, focus restoration and retained edits/error results
  are verified. First-time onboarding keeps its form and saved outcome mounted
  through revalidation instead of hiding it when the first record appears.
- Planning groups real route/privacy fields, times/timezone and riders in a
  bounded layout with paired fields, v3 inputs and explicit family selection.
  Authentication, recovery, loading, empty and error views share the same tokens.

## Necessary deviations and boundaries

| V3 element | Working application |
| --- | --- |
| Map, location freshness and ETA | Omitted. A meaningful trip/responsibility summary uses the same hero layout; reports are explicitly manual and require reload. |
| Contact, notification, prototype and theme controls | No unsupported controls or simulated delivery. The verified light palette is used consistently. |
| One sample family/child | Real authorized families, guardians and independent child journeys. No sample identity, approval count, clock or vehicle assumptions. |
| Team-wide/standing approval | Real driver acceptance and each family's explicit consent for its own children, bound to the saved plan. Joining a circle grants no blanket consent. |
| Original versus replacement vehicle | The projection supplies the original driver's name and latest candidate vehicle, not a separate original-vehicle snapshot. Candidate vehicles are labeled explicitly; absent data is never invented. |
| Replacement and unavailable driver | Optional swaps preserve the available original driver. Unavailable rides stay uncovered after decline, cancellation or expiry until actual acceptance and every required child consent complete. |
| Arrival and completion | Arrival awaits designated guardian receipt. Every child completes independently; only the final receipt completes the ride. |
| Planning dialog/day filter | Real route summaries and private locations, end time, timezone, rider selection and invitation authority require a fuller planning page. The seven-day tally retains full-week visibility rather than hiding other days. Focused smaller mutations use dialogs. |
| Private invitation/proposed-only driver | Existing minimal projections remain intact. Joining/confirmation is required before exact private trip details are shown. |

The prototype's browser storage, simulated replies, automatic approvals and sample
capabilities are never imported. Informational history, daylight-saving choices
and destructive confirmation steps can still use native disclosures; primary
route, driver and consent information is no longer hidden wholesale.

## Visual comparison record

Reference and application views were compared at desktop and phone sizes using
the same persisted Bob account and demo records, without mutations. Auth fields
were empty and each application view started at the top with its default UI state.
Generated screenshots and comparison viewers are excluded from the repository;
the supplied reference sources and [v3 checklist](v3-parity-checklist.md) remain
the visual contract.

## Validation and review

The saved demo views were checked with axe at desktop/phone sizes and for 320px
reflow, including uncovered, pending, confirmed, replacement, declined, expired,
cancelled, picked-up, awaiting-receipt and completed states. Dialog captures were
also checked. Browser journeys exercise real independent adults, keyboard/focus,
explicit consent, unauthorized action replay and save/error visibility.

The existing test harness owns a separate disposable backend on ports
55320–55329. Its clean/upgrade and authorization tests never reset the user's
normal Pool backend. CLI subprocesses also run with that disposable directory as
their working directory, keeping reset/branch discovery out of the application
checkout. Node 24 lint/types, 72 unit regressions and production build,
Compose validation and the production container smoke have passed. The final full
local run passed all **12 browser journeys** (5.0 minutes), including independent
child receipt and removal of completed rides from the upcoming queue. The six
supplied v3 behavioral tests also pass; those tests are reference evidence, not
proof of application authorization. Final journey/CI results and the focused
Codex review are recorded in PR #10; no hosted delivery or full screen-reader
audit is claimed.

The app is left running at [localhost:3000](http://localhost:3000) for user inspection. No merge,
release, deployment, force-push or history rewrite is part of this work.
