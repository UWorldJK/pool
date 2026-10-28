# CTO decisions

## Principles
* [DISCOVERED, confirmed by Sam] Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Supabase (Postgres + Auth), Node 24, Docker for local, Vercel container runtime for production.
* Build only the core ride loop first. Add Twilio, Resend, maps and realtime when a feature needs them (Lance's review in #all-pool-cu-boulder, 2026-10-22).
* Local Supabase only until the hosted project's service role key is rotated.

## Features
* [core-ride-loop](core-ride-loop.md)
