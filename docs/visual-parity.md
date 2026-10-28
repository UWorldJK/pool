# R8 — A calmer Pool

PR [#10](https://github.com/UWorldJK/pool/pull/10) continues on
`lkluge/web-visual-parity`, based on R7 `0bab9a3`
([PR #9](https://github.com/UWorldJK/pool/pull/9)). Production remains restricted
to validated, protected, PR-merged current `main`. This is presentation work:
no schema, API, RPC, authorization, server-action or release-policy changes.
CI pins Ubuntu 24.04 because the pinned Playwright version cannot install on
GitHub’s migrated Ubuntu 26.04 runner. Required checks and release gates are retained.

## Design and interaction references

The original `sites/pool-prototype/dist` is the primary visual reference: Pool's
mark, restrained green, warm ink, light canvas, white surfaces, route markers,
soft status fills, balanced spacing and calm navigation. The final design uses
native system typography and fewer visible controls. It preserves the original's
character without reproducing every panel or its sample-data claims.

`sites/pool-prototype-v3/dist`, `DESIGN-NOTES.md`, its six behavioral tests,
`exports/pool-v3.html`, and the roadmap's prototype-conflict table informed the
interaction review. The export has a malformed initial font import; it remains
preserved as supplied. The prototype's browser-storage logic, simulations,
automatic approvals and sample capabilities were not transplanted. Reference
files, local README edits, accounts and existing demo data remain intact.

## Presentation changes

- Four main destinations: needs attention, the weekly schedule, families/circles
  and driving. Children, vehicles and invitations remain available in context.
  Account details and sign-out sit behind Account. Phone navigation retains a
  native modal dialog, trapped focus, Escape and focus restoration.
- Existing memberships lead the home screen. Family creation is prominent for
  an empty account and expandable for an established family. Removal, editing,
  invitation history and other infrequent controls open on request.
- The schedule retains all seven days and both directions. Compact ride rows
  show one route, pickup/end times, actual driver/coverage and outstanding
  replies. A past pickup never becomes a completion claim. Week and timezone
  controls open from the week toolbar.
- Ride pages lead with route, time, actual current driver and an explicit review
  link when a reply is needed. Active trips bring per-child handoffs forward.
  The adult's own family's children appear first and keep their position through
  saved reports; each child's completion remains independent. Historical report times stay available.
- Planning groups route, time and riders. Repeated-hour options open only when
  needed. Replacement deadlines use a native UTC date/time input while sending
  the same explicit UTC `deadline` value to the existing action.
- Native expandable sections retain their open state across revalidation so a
  save or error cannot hide its own result. Consent, acceptance and receipt
  still require the existing explicit checkboxes and authenticated submissions.

## Important distinctions retained

| State or boundary | Presentation |
| --- | --- |
| Nomination versus coverage | Proposals identify the actual candidate and vehicle; acceptance and child-consent totals remain separate. Unconfirmed proposals are explicitly uncovered. |
| Optional swap | The available original driver stays visibly assigned until the replacement is fully confirmed. Candidate vehicle data is labeled as candidate data. |
| Driver unavailable | No released driver is presented as current coverage. Decline, cancellation and expiry leave the ride uncovered until a fresh request completes. |
| Closed optional request | Declined, cancelled and expired candidate history stays distinct from the still-available original assignment. |
| Arrival | Awaiting guardian receipt persists. Arrival never implies receipt or whole-ride completion. |
| Child completion | Every child has their own terminal handoff status; other children remain awaiting receipt. |
| Authority | The same verified public-key session, RLS projections and authenticated actions govern every read and write. Disclosures do not grant access. |
| Private invitation/proposal | Coarse route and necessary seat information only. Missing private driver data is not evidence that an unjoined ride has no driver. |
| Unsupported features | No GPS, ETA, maps, notification delivery, standing driver approval, simulated consent or automatic receipt. |

The current `driver_status` contract supplies the latest candidate vehicle and
original-driver name, but no separate original-vehicle snapshot during a swap.
The UI labels the candidate vehicle explicitly and does not invent missing data.
Native system typography replaces the earlier R8 font use; the preserved local
font asset and license are no longer requested by the UI.

## Comparable screenshots

The sets below use the **same saved local demo records and Bob's account**, with
no ride mutations, reseeding or database reset. Before is commit `9337100`, served
from a temporary snapshot; after is the revised PR. Each view starts at the top
with its default disclosure state. Desktop is **1440×1000** and phone is
**390×844**; saved JPEG dimensions were checked. Fictional demo names and dates
are intentionally identical. Auth views use empty fields. The older
`r8-screenshots/` evidence remains preserved and is not overwritten.

| View | Desktop before / after | Phone before / after |
| --- | --- | --- |
| Families and circles | [Before](simplification-screenshots/before/families-desktop.jpg) · [After](simplification-screenshots/after/families-desktop.jpg) | [Before](simplification-screenshots/before/families-phone.jpg) · [After](simplification-screenshots/after/families-phone.jpg) |
| Family management | [Before](simplification-screenshots/before/family-desktop.jpg) · [After](simplification-screenshots/after/family-desktop.jpg) | [Before](simplification-screenshots/before/family-phone.jpg) · [After](simplification-screenshots/after/family-phone.jpg) |
| Circle management | [Before](simplification-screenshots/before/circle-desktop.jpg) · [After](simplification-screenshots/after/circle-desktop.jpg) | [Before](simplification-screenshots/before/circle-phone.jpg) · [After](simplification-screenshots/after/circle-phone.jpg) |
| Children | [Before](simplification-screenshots/before/children-desktop.jpg) · [After](simplification-screenshots/after/children-desktop.jpg) | [Before](simplification-screenshots/before/children-phone.jpg) · [After](simplification-screenshots/after/children-phone.jpg) |
| Vehicles | [Before](simplification-screenshots/before/vehicles-desktop.jpg) · [After](simplification-screenshots/after/vehicles-desktop.jpg) | [Before](simplification-screenshots/before/vehicles-phone.jpg) · [After](simplification-screenshots/after/vehicles-phone.jpg) |
| Planning | [Before](simplification-screenshots/before/planning-desktop.jpg) · [After](simplification-screenshots/after/planning-desktop.jpg) | [Before](simplification-screenshots/before/planning-phone.jpg) · [After](simplification-screenshots/after/planning-phone.jpg) |
| Weekly schedule | [Before](simplification-screenshots/before/schedule-desktop.jpg) · [After](simplification-screenshots/after/schedule-desktop.jpg) | [Before](simplification-screenshots/before/schedule-phone.jpg) · [After](simplification-screenshots/after/schedule-phone.jpg) |
| Needs attention | [Before](simplification-screenshots/before/attention-desktop.jpg) · [After](simplification-screenshots/after/attention-desktop.jpg) | [Before](simplification-screenshots/before/attention-phone.jpg) · [After](simplification-screenshots/after/attention-phone.jpg) |
| Needs a driver | [Before](simplification-screenshots/before/needs-driver-desktop.jpg) · [After](simplification-screenshots/after/needs-driver-desktop.jpg) | [Before](simplification-screenshots/before/needs-driver-phone.jpg) · [After](simplification-screenshots/after/needs-driver-phone.jpg) |
| Driver reply pending | [Before](simplification-screenshots/before/pending-desktop.jpg) · [After](simplification-screenshots/after/pending-desktop.jpg) | [Before](simplification-screenshots/before/pending-phone.jpg) · [After](simplification-screenshots/after/pending-phone.jpg) |
| Confirmed | [Before](simplification-screenshots/before/confirmed-desktop.jpg) · [After](simplification-screenshots/after/confirmed-desktop.jpg) | [Before](simplification-screenshots/before/confirmed-phone.jpg) · [After](simplification-screenshots/after/confirmed-phone.jpg) |
| Optional replacement | [Before](simplification-screenshots/before/replacement-desktop.jpg) · [After](simplification-screenshots/after/replacement-desktop.jpg) | [Before](simplification-screenshots/before/replacement-phone.jpg) · [After](simplification-screenshots/after/replacement-phone.jpg) |
| Unavailable driver | [Before](simplification-screenshots/before/unavailable-desktop.jpg) · [After](simplification-screenshots/after/unavailable-desktop.jpg) | [Before](simplification-screenshots/before/unavailable-phone.jpg) · [After](simplification-screenshots/after/unavailable-phone.jpg) |
| Declined | [Before](simplification-screenshots/before/declined-desktop.jpg) · [After](simplification-screenshots/after/declined-desktop.jpg) | [Before](simplification-screenshots/before/declined-phone.jpg) · [After](simplification-screenshots/after/declined-phone.jpg) |
| Expired optional swap | [Before](simplification-screenshots/before/expired-desktop.jpg) · [After](simplification-screenshots/after/expired-desktop.jpg) | [Before](simplification-screenshots/before/expired-phone.jpg) · [After](simplification-screenshots/after/expired-phone.jpg) |
| Cancelled ride | [Before](simplification-screenshots/before/cancelled-desktop.jpg) · [After](simplification-screenshots/after/cancelled-desktop.jpg) | [Before](simplification-screenshots/before/cancelled-phone.jpg) · [After](simplification-screenshots/after/cancelled-phone.jpg) |
| Picked up | [Before](simplification-screenshots/before/picked-up-desktop.jpg) · [After](simplification-screenshots/after/picked-up-desktop.jpg) | [Before](simplification-screenshots/before/picked-up-phone.jpg) · [After](simplification-screenshots/after/picked-up-phone.jpg) |
| Arrival awaiting receipt | [Before](simplification-screenshots/before/awaiting-receipt-desktop.jpg) · [After](simplification-screenshots/after/awaiting-receipt-desktop.jpg) | [Before](simplification-screenshots/before/awaiting-receipt-phone.jpg) · [After](simplification-screenshots/after/awaiting-receipt-phone.jpg) |
| Completed | [Before](simplification-screenshots/before/completed-desktop.jpg) · [After](simplification-screenshots/after/completed-desktop.jpg) | [Before](simplification-screenshots/before/completed-phone.jpg) · [After](simplification-screenshots/after/completed-phone.jpg) |
| Authentication | [Before](simplification-screenshots/before/authentication-desktop.jpg) · [After](simplification-screenshots/after/authentication-desktop.jpg) | [Before](simplification-screenshots/before/authentication-phone.jpg) · [After](simplification-screenshots/after/authentication-phone.jpg) |

The [expanded phone replacement review](simplification-screenshots/after/replacement-review-phone.jpg) shows the candidate and explicit per-child selection; opening it does not save consent.

## Validation

The browser suite creates a disposable backend on ports 55320–55329; it never
resets the normal Pool backend. Functional journeys open secondary controls using
their native disclosure UI. Dedicated presentation checks cover default layouts,
keyboard navigation and save/error visibility. Accessibility assertions include
axe, 320px reflow, desktop/phone layouts and 44px buttons, checkbox labels and
disclosure targets. These checks do not constitute a full screen-reader audit.

Validation results and the focused Codex review are recorded in PR #10. Hosted
delivery is not claimed. No merge or production release is part of this work.
