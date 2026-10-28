## Design Critique: Pool core ride loop (built app vs v3 prototype)

Reviewed with the demo team (`npm run db:demo`) as Alex Morgan at 1280px and 375px, light and dark.

### Overall Impression
The build keeps v3's calm, status-first character: the hero answers "where is my kid" in one sentence, and Needs attention gives one clear next step. The biggest gap was that the hero did not switch its tag and primary action when it became the parent's turn. That is now fixed.

### Usability
| Finding | Severity | Recommendation | Status |
|---------|----------|----------------|--------|
| Hero tag said "On the way" (green) while the hero said "Your turn" (amber) | 🔴 Critical | Show "Handoff needed" whenever one of your children has arrived | Fixed |
| Primary button was "Ride details" when the parent's job was to confirm a handoff | 🔴 Critical | Make Confirm handoff primary in that state, Ride details secondary | Fixed |
| At 375px the handoff task squeezed its text into a narrow column | 🟡 Moderate | Wrap dialog trigger and dialog so the row layout treats them as one item | Fixed |
| Dialogs opened pinned to the left edge | 🟡 Moderate | Restore `margin: auto` removed by Tailwind's reset | Fixed |
| Success messages vanished with the form that sent them | 🟡 Moderate | Toast in a persistent live region, like v3 | Fixed |
| A ride with a pending request was listed twice in Needs attention | 🟡 Moderate | List it once, as the decision | Fixed |
| Organizer sees "Cancel this request" inside the decision notice next to Approve and Decline | 🟢 Minor | Move it below the notice or into an overflow, so the family decision stays primary | Open |
| Hero sentences quote ride names mid sentence ("You're driving To practice today") | 🟢 Minor | Lowercase common titles or set the name in a second line | Open |
| "Plan a ride" sits above the journey card on phones, pushing the status down | 🟢 Minor | On phones, move Plan a ride below Needs attention | Open |

### Visual Hierarchy
- **What draws the eye first**: the hero sentence, then the big status word ("Your turn"). Correct; this matches v3's status-first layout.
- **Reading flow**: status, then route, then driver, then action, then riders. On phones the riders list falls below the fold, but the handoff button is now in the hero, so the parent never needs to scroll for it.
- **Emphasis**: amber is reserved for things that need the viewer (handoff, missing driver, pending decision), green for settled states. Kept consistent across tags, notices and task icons.

### Consistency
| Element | Issue | Recommendation |
|---------|-------|----------------|
| Rider timeline | Today and Ride details had diverging copies | Shared `RiderTimeline` component (done) |
| Buttons | `SubmitButton` changed its label to "Saving…" | Keep the label, disable while pending (done) |
| Map | v3's illustrative map is gone | Intentional: no GPS. The side panel shows rider progress instead, and copy says "no live location" |

### Accessibility
- **Color contrast**: v3's v2-audited tokens are unchanged. Body muted text #5b6c64 on #f6f7f2 is about 5.3:1; amber #785016 on #faf0d8 about 6.6:1; dark theme muted #b9c9bd on #17231e about 10:1. All pass AA.
- **Touch targets**: buttons, nav items and switches are at least 44px tall; the phone bottom nav is 48px.
- **Text readability**: 15px body, nothing under 12px. Headings use Manrope with tight tracking as in v3.
- **Semantics**: native `<dialog>` with labelled titles; live region for toasts; inline errors use `role="alert"` and take focus; switches use `role="switch"` with `aria-checked`. Playwright's role-based locators (accessible names) drive every e2e step.

### What Works Well
- The safety model is visible in the copy: "A proposed driver is not an assignment", "Only each child's family can confirm a handoff".
- Pending and declined states never pretend anything changed; the current driver stays shown during a swap.
- Dark mode follows the device and can be overridden in Settings, with no flash, because the server renders the chosen theme.

### Priority Recommendations
1. **Notifications** are the largest UX gap: Needs attention only helps people who open the app. Start with email (Resend) for handoff needed and approval requests.
2. **Move "Cancel this request"** out of the family decision notice for organizers.
3. **Phone layout of Today**: move Plan a ride below Needs attention so status and action stay above the fold.
