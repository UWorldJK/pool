# V3 correction checklist

Compared the unchanged export and v3 distribution with commit `96fe52c` at
1440×1000 and 390×844 before editing. Captures are in `v3-screenshots/`.
The export's broken font import is preserved; the distribution establishes DM
Sans and Manrope and the intended rendering.

- [x] Restore DM Sans body text, Manrope headings, v3 weights and sizes.
- [x] Match sage canvas/sidebar, lime selected navigation, green/amber pills,
  232px sidebar, 85px top bar, content insets and persistent phone navigation.
- [x] Restore family/circle context, visible children/vehicles/invitation links,
  avatars, route dots, date tiles, borders and 15px card composition.
- [x] Use a real trip summary, attention tasks and two-column upcoming cards;
  retain a full seven-day schedule and explicit uncovered states.
- [x] Keep route, driver identity, candidate identity, capacity and consent
  visible on ride details; use focused dialogs for secondary mutations.
- [x] Apply the same language to auth/onboarding, families, circles, children,
  vehicles, planning, driving, replacements and independent child handoffs.
- [x] Compare after images against v3 and before; fix desktop/phone/320px
  mismatches. Verify contrast, keyboard, focus return and save/error outcomes.
- [x] Run functional multi-user journeys, real authorization/database checks,
  unit checks and production build; review the full PR diff. Push, focused
  Codex review, findings and CI are tracked in PR #10.

Necessary deviations: no illustrative operational map, GPS, ETA, contact or
notification controls; no sample identities, counts, clocks, simulated replies,
automatic acceptance or consent. Actual per-child states and authorized forms
take priority over the prototype's single-child shortcut.
