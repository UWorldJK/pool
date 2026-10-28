# R8 — Original Pool design, corrected interactions

R8 is based on remote R7 `0bab9a3` (`lkluge/driver-replacements`), which contains
R1–R7. Parent: [PR #9](https://github.com/UWorldJK/pool/pull/9). The PR targets
that branch; production delivery remains limited to validated, protected,
PR-merged current `main`. CI now admits the R7 stacked base. There are no schema,
RPC, server-action, authorization or release-policy changes.

## Reference choice

Inspected the running R7 app and the preserved local originals before styling:

- `sites/pool-prototype/dist`: visual source — DM Sans, `#f7f8fa` canvas,
  `#23332f` ink, `#326a55` green, white sidebar, 87px desktop header, rounded
  cards, compact route rows, soft status fills and generous section spacing.
- `sites/pool-prototype-v3/dist`, its `DESIGN-NOTES.md` and six model tests:
  interaction evidence, interpreted through the implemented authorization rules.
- `exports/pool-v3.html`: standalone behavioral reference, including separate
  arrival and explicit receipt. Its model is embedded verbatim from v3. The export’s initial font-import text is malformed, so it is behavioral evidence, not the visual source; the reference is preserved as supplied. None of its browser-storage application is copied.
- `docs/development-roadmap.md`: R8 and the prototype-conflict table.

Original visual language is the implementation reference. Final visual sign-off
belongs to the user; these are comparable implementation screenshots, not a claim
that the prototype and production functionality are identical. Original files
remain untracked and unmodified. DM Sans is locally hosted with its OFL license;
no font provider request is made while using Pool.

## Intentional differences

| Original design | Working application |
| --- | --- |
| Fictional team switcher, family photos, ride counts and blanket coverage reassurance | Actual memberships, route data and saved replies; counts only from authorized records. No invented team or all-covered message. |
| Overview/map split and sample live route | Real family/circle cards, schedule, assignment and per-child progress cards. Maps, ETAs and sharing claims are omitted. |
| Tiny pale text and small icon-only controls | Darker secondary text, readable labels, 44px primary/checkbox targets, visible focus, skip link and 16px form inputs. |
| Four prototype navigation destinations and demo settings | Existing real application destinations; active-page indication and a native modal navigation dialog on phones with Escape, trapped focus and restoration. |
| Direction/day filters can conceal open needs | Seven visible days and all rides/directions in the selected week. Separate needs-attention destination and literal coverage states. |
| One route field | Explicit pickup and destination. Invitation/proposed-driver projections stay coarse; private locations remain behind existing participation/driver checks. A missing private driver projection for an unjoined family is not presented as proof that a ride is uncovered. |
| Candidate or fallback vehicle looks like current coverage | Vehicle always belongs to the explicitly labeled proposal/candidate. Current original-driver name is shown separately during a swap; closed requests are labeled declined/cancelled/expired. |
| Nomination or one parent appears to approve everyone | Actual driver acceptance and per-child guardian consent remain separate. No simulator, override approval or standing circle-approval badge. |
| Original driver remains through every change | Only available originals remain during optional swaps. Unavailable rides stay uncovered until real acceptance and complete fresh consent. |
| Arrival preview can imply completion | Arrival persists as awaiting guardian receipt. Every child has an independent, terminal receipt state; trip completion requires them all. |
| Drawers for ride workflows | Existing navigable pages and explicit, persisted forms. Closing navigation never mutates a ride. |
| Later prototype dark switch | Original light appearance retained. No theme switch or dark palette is shipped; system dark preference still shows this tested light design. |
| Notification, contact and settings controls | Omitted unless already implemented. Manual invitation links remain explicitly manual. |

The current `driver_status` contract supplies the latest candidate vehicle and
current original-driver name, but does **not** supply a separate current vehicle
snapshot during a different candidate request. R8 labels candidate vehicle data
explicitly and does not invent that missing snapshot. A richer current-vehicle
projection would require separate contract scoping; no permission bypass or
schema change was added here.

## Screenshot evidence and reproduction

The before set is rendered from unchanged R7; the after set is rendered from R8.
Both use the same authenticated R7 journey, real public-key sessions, persisted
records and actions on disposable local Supabase. Fixture names appear only in
tests and their screenshots. No production/demo fixtures are added. Desktop is
1440×1000; phone is 390×844. Long detail pages are anchored at the same named
assignment/progress heading. Dates/IDs and captured account emails can differ
between independent runs. The final candidate/current-driver test also gives the two vehicles distinct labels to guard against fallback mix-ups.

| State | Desktop before / after | Phone before / after |
| --- | --- | --- |
| Empty | [Before](r8-screenshots/before/empty-desktop.png) · [After](r8-screenshots/after/empty-desktop.png) | [Before](r8-screenshots/before/empty-phone.png) · [After](r8-screenshots/after/empty-phone.png) |
| Uncovered | [Before](r8-screenshots/before/uncovered-desktop.png) · [After](r8-screenshots/after/uncovered-desktop.png) | [Before](r8-screenshots/before/uncovered-phone.png) · [After](r8-screenshots/after/uncovered-phone.png) |
| Pending | [Before](r8-screenshots/before/pending-desktop.png) · [After](r8-screenshots/after/pending-desktop.png) | [Before](r8-screenshots/before/pending-phone.png) · [After](r8-screenshots/after/pending-phone.png) |
| Confirmed | [Before](r8-screenshots/before/confirmed-desktop.png) · [After](r8-screenshots/after/confirmed-desktop.png) | [Before](r8-screenshots/before/confirmed-phone.png) · [After](r8-screenshots/after/confirmed-phone.png) |
| Cancelled optional swap | [Before](r8-screenshots/before/closed-swap-desktop.png) · [After](r8-screenshots/after/closed-swap-desktop.png) | [Before](r8-screenshots/before/closed-swap-phone.png) · [After](r8-screenshots/after/closed-swap-phone.png) |
| Declined optional swap | [Before](r8-screenshots/before/declined-desktop.png) · [After](r8-screenshots/after/declined-desktop.png) | [Before](r8-screenshots/before/declined-phone.png) · [After](r8-screenshots/after/declined-phone.png) |
| Expired optional swap | [Before](r8-screenshots/before/expired-desktop.png) · [After](r8-screenshots/after/expired-desktop.png) | [Before](r8-screenshots/before/expired-phone.png) · [After](r8-screenshots/after/expired-phone.png) |
| Arrival awaiting receipt | [Before](r8-screenshots/before/awaiting-handoff-desktop.png) · [After](r8-screenshots/after/awaiting-handoff-desktop.png) | [Before](r8-screenshots/before/awaiting-handoff-phone.png) · [After](r8-screenshots/after/awaiting-handoff-phone.png) |
| Completed | [Before](r8-screenshots/before/completed-desktop.png) · [After](r8-screenshots/after/completed-desktop.png) | [Before](r8-screenshots/before/completed-phone.png) · [After](r8-screenshots/after/completed-phone.png) |

Additional R8 views: [authentication desktop](r8-screenshots/after/authentication-desktop.png) / [phone](r8-screenshots/after/authentication-phone.png),
[family desktop](r8-screenshots/after/family-desktop.png) / [phone](r8-screenshots/after/family-phone.png),
[circle desktop](r8-screenshots/after/circle-desktop.png) / [phone](r8-screenshots/after/circle-phone.png),
[ride planning desktop](r8-screenshots/after/planning-desktop.png) / [phone](r8-screenshots/after/planning-phone.png),
and [full week desktop](r8-screenshots/after/schedule-desktop.png) / [phone](r8-screenshots/after/schedule-phone.png).

Run `POOL_SCREENSHOTS_DIR=docs/r8-screenshots/after npm run test:auth` with Node
24.22.1 and Docker. This creates its own disposable backend and leaves existing
Pool data intact. CI runs the same interactions, axe checks, reflow and target
assertions without writing screenshots. `POOL_BASELINE=1` is exclusively a
screenshot-capture option for running this helper against original R7; it skips
R8-specific accessibility assertions. It is not set in CI.

Local validation passed: Node 24.22.1 lint/type checks, 72 unit tests, production build, clean/upgrade migrations and generated-type equality, real-session permission/race tests, all 12 browser journeys, disposable Compose validation and production container smoke. A separate keyboard pass in the running app verified forward/backward dialog wrapping, Escape and Menu focus restoration. GitHub checks and review status are recorded in the PR. Hosted delivery is
not claimed; the inherited merged-main release gates remain intact.
