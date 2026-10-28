# Architect decisions

## Principles
* Reads through RLS, writes through Postgres functions only (ADR-001).
* Magic link with token hash confirmation and a session refresh proxy (ADR-002).
* One Next.js app, stateless; Supabase holds all state.
* [DISCOVERED] Browser and server Supabase clients share the `pool-auth` cookie name; server uses `SUPABASE_INTERNAL_URL` inside Docker.

## Features
* [core-ride-loop](core-ride-loop.md)
