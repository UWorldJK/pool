# Product: core-ride-loop

Spec: `.10x/specs/2026-10-27-core-ride-loop-design.md`

## Users
* Parent or guardian in a youth soccer team (primary). Plans rides, drives, approves drivers, receives their child.
* Team organizer. Same as a parent, plus creates the team and invite links.

## User stories (MVP)
1. As a parent, I sign in with a link sent to my email.
2. As a new parent, I add my name, phone, car and seats, my family and my children.
3. As a parent, I create a team or join one from an invite link. I choose which children are on it.
4. As a second adult, I join my household from a family invite link.
5. As a parent, I approve or revoke drivers for each of my children.
6. As a team member, I plan a ride with riders, place names and time, optionally weekly for up to 12 weeks, and optionally as the driver.
7. As a team member, I offer to drive. If every family has approved me, I am assigned. If not, the missing families are asked for this ride.
8. As a team member, I propose another driver. They accept and missing families approve before anything changes.
9. As a driver, I release a ride I cannot drive. It shows as needing a driver.
10. As a driver, I mark each child picked up and arrived.
11. As a parent, I confirm my child's handoff after the driver reports arrival.
12. As a parent, I see what needs my attention, this week's schedule, and the activity log.

## Success criteria
* A new team can go from first sign in to a completed handoff with no help, verified by the Playwright journey.
* No path lets someone drive a child without that child's family's approval, verified by pgTAP.
* Every v3 screen in scope exists with v3's look on desktop and phone widths.

## Explicitly not in MVP
GPS, notifications, maps, calendar sync, editing riders, payments, background checks.
