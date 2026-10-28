# ADR-001: RLS for reads, Postgres functions for every write

**Status:** Accepted
**Date:** 2026-10-27
**Feature:** core-ride-loop
**Author:** 10x-Team (Architect + Staff Engineer)

## Context

Pool's value is its safety rules: a driver needs every rider's family's approval,
a proposed driver is never assigned silently, and only a child's family confirms
the handoff. Several rules span multiple tables (a family approval can complete a
request, which assigns the ride's driver). The repo already commits to the public
key only and to RLS on every user request; the README forbids service role keys in
session code.

## Decision

* The `authenticated` role gets SELECT on application tables, filtered by RLS
  policies that use `security definer` helper functions (`private.is_team_member`,
  `private.is_family_adult`, ...) to avoid policy recursion.
* No INSERT, UPDATE or DELETE grants on application tables for `anon` or
  `authenticated`.
* Each user action is one `public` function, `security definer`,
  `set search_path = ''`, that checks `auth.uid()`, locks the rows it changes,
  enforces the domain rules, writes the activity event and returns the result.
  `EXECUTE` is revoked from `public` and `anon` and granted to `authenticated`.
* Helper functions live in a `private` schema that PostgREST does not expose.
* Errors are raised as `POOL:<CODE>: message` so the app can map them.

## Alternatives Considered

| Alternative | Pros | Cons | Why Not |
| --- | --- | --- | --- |
| Server Actions with the service role key and checks in TypeScript | Familiar TypeScript; no SQL functions | Bypasses RLS entirely; one missed check exposes every family; contradicts the README and existing tests | Too much risk for children's data |
| Direct table writes under RLS policies | No functions; uses PostgREST directly | Multi table rules split across policies; races between approval and assignment; hard to read | Invariants would not be atomic |
| A separate API service | Full control | New deployable, new auth path, more ops | Not justified for this size |

## Consequences

### Positive
* Every rule holds no matter which client calls the database.
* Each action is one transaction, so approval and assignment cannot race.
* pgTAP can test rules and authorization directly with simulated users.

### Negative
* Business logic is in SQL, which the team writes less often than TypeScript.
* `security definer` functions must be written carefully: empty `search_path`,
  fully qualified names, explicit `auth.uid()` checks.

### Risks
* A function that forgets an authorization check grants more than RLS would.
  Mitigation: each function has an allowed and a refused pgTAP test, and the
  security review reads every function.

## Dependencies
* Supabase local stack with pgTAP (`supabase test db`).
* Constrains future features: new writes follow the same pattern.
