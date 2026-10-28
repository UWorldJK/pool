# CTO: core-ride-loop

**Verdict:** Build. No existing product combines per child driver approval with handoff confirmation for youth sports carpools; general carpool apps assume adults.

**Build vs buy:** Buy the platform pieces (Supabase Auth and Postgres, Vercel hosting). Build the domain rules, since they are the product.

**Tech direction:** Keep the current stack. No new runtime services. One new dev dependency: Playwright.

**Risks:**
* Leaked service role key for the hosted project (posted in #social on 2026-10-26). Must be rotated before any hosted use.
* SQL heavy business logic (ADR-001) needs reviewers comfortable with Postgres.

**Opportunity cost:** Notifications are the most requested follow up and are deferred. Without them, Needs attention only helps people who open the app.
