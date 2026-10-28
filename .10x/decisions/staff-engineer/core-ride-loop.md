# Staff engineer: core-ride-loop

## Cross cutting concerns
* **Auth:** pages call `requireUser()` (server, `auth.getUser()`); the proxy only refreshes and redirects.
* **Errors:** one mapping table from `POOL:<CODE>` to copy in `src/lib/pool/errors.ts`, unit tested.
* **Time:** store `timestamptz`; format in the team's timezone with `Intl.DateTimeFormat`. Weekly repeats are generated in SQL so DST is handled by Postgres (`starts_at + n * interval '1 week'` in the team zone).
* **Forms:** Server Actions with `useActionState`; native validation first, server validation always.
* **Theming:** tokens as CSS variables; dark theme under `prefers-color-scheme` and `[data-theme]`.
* **Generated types:** regenerate after every migration change; never edit by hand.

## Reuse
* Keep `src/lib/supabase/config.ts`, `client.ts`, `server.ts` and their tests. Add the `Database` generic to both clients.
* Keep `/api/health` and the landing page content as the signed out home.
