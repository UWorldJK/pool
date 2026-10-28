# Security review: core-ride-loop (2026-10-27)

## Threat model (short)
Assets: children's names and which rides they are on, parents' phone numbers, driver approvals, handoff confirmations.
Actors: signed out visitors, members of other teams, members of the same team who are not a child's family, someone holding a forwarded invite link.

## Controls verified
* **RLS on every table**, SELECT only for `authenticated`, nothing for `anon` (pgTAP: anon read and write refused, direct UPDATE/INSERT/DELETE refused for members).
* **Every write is a `security definer` function** with `search_path = ''`, an `auth.uid()` check and a domain check. Each function was read for its authorization line; each has an allowed and refused test.
* **Private helpers** are not executable by `authenticated` except the read only policy helpers, and the `private` schema is not exposed by the Data API.
* **Server Actions** re-check the session and pass only validated UUIDs and bounded strings; errors map to fixed copy, never raw database messages.
* **Session** validated with `auth.getUser()` in the proxy and in every page through `requireUser()`.
* **Redirects**: `next` paths pass `safeNextPath` (refuses `//host`, `/\host`, absolute URLs); unit tested.
* **Invite tokens**: 244 random bits, only the SHA-256 hash stored, 7 day expiry, household links single use, one generic error for invalid tokens.
* **Public key only** in the app; no service role or secret key anywhere in `src/`. The demo seed uses the public sign up endpoint.

## Findings
| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| 1 | High (external) | The hosted project's service role key was shared in team chat on 2026-10-26 | Open. Rotate before any hosted use. Not touched by this work. |
| 2 | Medium | `cancel_request` authorization used `<>` against a nullable creator, so a deleted creator let any member cancel | Fixed, pgTAP regression test |
| 3 | Medium | Team invite links are reusable for 7 days. A forwarded link exposes the team's rides, children's first names and parents' phone numbers | Accepted for MVP. Next: organizer can revoke links and remove members |
| 4 | Low | No Content Security Policy or security headers beyond Next defaults | Open. Add CSP and `Referrer-Policy` before hosting |
| 5 | Low | Hosted magic link email needs the same token hash template and real SMTP; Supabase's default hosted email rate limit is low | Open, documented in ADR-002 |
| 6 | Low | Children removed from a roster stayed on upcoming rides, visible to no one but still riding | Fixed: removal takes them off upcoming rides |

## Not in scope
Location data (none collected), notifications, payments.
