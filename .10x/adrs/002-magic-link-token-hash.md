# ADR-002: Magic link sign in with token hash confirmation

**Status:** Accepted
**Date:** 2026-10-27
**Feature:** core-ride-loop
**Author:** 10x-Team (Architect + Security Engineer)

## Context

Sam chose passwordless email sign in. Parents often request the link on a laptop
and open the email on a phone. `@supabase/ssr` defaults to the PKCE flow, whose
code exchange needs a verifier cookie from the browser that asked for the link.

## Decision

* `/login` calls `signInWithOtp` with `shouldCreateUser: true`.
* The local magic link email template links to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=...`.
* `/auth/confirm` is a Route Handler that calls `verifyOtp({ type, token_hash })`,
  sets the session cookies and redirects to a same origin path only.
* `src/proxy.ts` refreshes the session with `supabase.auth.getUser()` on every
  matched request and redirects signed out users from app routes to `/login`.
* Pages authorize with `auth.getUser()` (server validated), never with
  `getSession()` alone.
* The local auth email rate limit is raised so tests can sign in repeatedly.

## Alternatives Considered

| Alternative | Pros | Cons | Why Not |
| --- | --- | --- | --- |
| Default PKCE code flow | No template change | Fails when the link opens on another device | Common case for parents |
| Six digit email OTP code | Works across devices | More typing; another screen | Can be added later beside the link |

## Consequences

### Positive
* Links work on any device until they expire.
* Matches Supabase's documented SSR pattern.

### Negative
* The hosted project needs the same email template, set in the dashboard.

### Risks
* Open redirect through `next`. Mitigation: only accept paths starting with a
  single `/`.

## Dependencies
* Hosted launch needs real SMTP (Resend) and site and redirect URLs configured.
