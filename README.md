# Pool

A small Next.js application for Pool's frontend and server logic, with Supabase
for Postgres and authentication. Docker runs the app locally; the official
Supabase CLI manages the local backend. Production uses a Vercel container and
hosted Supabase.

Adults can create an email/password account, confirm their email, sign in/out,
and recover their password. `/app` supports families, guardians, circles and manual
membership invitations. Ride workflows, live location, notifications and calendar
sync are not implemented. The existing `sites/` and
`exports/` prototypes remain reference material and are excluded from builds.

## Start locally

Install Node.js 24 (the exact version is in `.nvmrc`) and a running Docker-compatible
container runtime. Use Docker Compose 2.32 or newer for Watch's initial sync.
No global Supabase CLI installation is needed; npm installs the pinned version.

On Docker Desktop, first select **Settings → Resources → Network → Port binding
behavior → Localhost by default**. Desktop's host port forwarder can ignore the per-network
default below. This is a supported Docker setting and applies to future
containers on the machine; the setup does not change it automatically. See
[Docker Desktop networking](https://docs.docker.com/desktop/features/networking/).

```sh
npm ci
cp .env.example .env.local
```

Create the local network **once**. Its setting requests localhost-only publishing
for Supabase's ports on Docker Engine:

```sh
docker network create --driver bridge \
  --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 pool-local
```

Start Supabase and retrieve its local connection settings:

```sh
npm run supabase:start
npm run supabase:status
```

Copy the **publishable key** from that output into
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Keep the other example
values for Docker development. Then start the app:

```sh
docker compose up --build --watch
```

- App: <http://localhost:3000>
- Application health: <http://localhost:3000/api/health>
- Supabase Studio: <http://localhost:54323>
- Local email inbox: <http://localhost:54324> (no real email is sent)

The first start downloads the Supabase images and can take several minutes.
Watch syncs source and public files; dependency or build-configuration changes
rebuild the development image. After changing `.env.local`, recreate the app with
`docker compose up --build --watch` so it receives the new settings.

Supabase must start before the app: its CLI owns the backend containers, while
Compose owns only the app. Do not start a second Supabase project on these same
ports. If the network already exists, inspect it with `docker network inspect
pool-local` and confirm its `host_binding_ipv4` option is `127.0.0.1`.
Check the actual published listeners after the first start too. Supabase's API,
database, Studio and mail inbox should be reachable only through loopback. Older
Docker Desktop versions can report `0.0.0.0` in `docker ps` even when the Desktop
binding preference is active; on macOS, `lsof -nP -iTCP:54321 -sTCP:LISTEN` shows
the actual host listener. If it listens on all interfaces, stop Supabase and
correct the Docker Desktop port-binding preference before continuing.

### Stop or reset

Stop Watch with Ctrl+C, then stop the app and backend:

```sh
docker compose down
npm run supabase:stop
```

Normal shutdown preserves Supabase's Docker volumes. Start again with the same
commands to reuse the data. **To erase and recreate only the local database**, run
`npm run supabase:reset` while Supabase is running. Do not use volume-pruning
commands as a normal shutdown step.

Versioned membership migrations live in `supabase/migrations/`. Apply them to your
existing local database with `npx supabase db push --local --network-id pool-local`;
this preserves existing Auth users. There are no ride tables or seed families.

## Settings and Supabase clients

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-accessible URL: `http://localhost:54321` locally, the hosted project's HTTPS URL when deployed. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public project key (`sb_publishable_...`), from the local CLI or hosted project's Connect dialog. Legacy `anon` JWT keys also work in this variable. |
| `SUPABASE_INTERNAL_URL` | Server-only override for Docker: `http://api.supabase.internal:8000`. Omit it for hosted Supabase or host-native development. |
| `PORT` | App listener port; use `3000` locally and in Vercel project settings. |

The browser cannot resolve Docker hostnames, and a container's `localhost` is
the container itself. Both URLs reach the same local Supabase API gateway. The
browser and server helpers use the same `pool-auth` cookie name so their
different connection addresses do not create separate sessions.

Use the browser helper in Client Components, `createClient` from the server helper
in Route Handlers/Server Actions, and `createReadOnlyClient` in Server Components.
`src/proxy.ts` refreshes both request and response cookies before auth rendering.
Protected rendering and mutations verify identity with `auth.getUser()` and require
a confirmed, non-anonymous email identity. Normal clients retain public-key access.
Auth pages, callbacks, redirects and refresh responses are private/no-store; the
public landing page, static assets and health endpoint do not require Auth.
All membership tables have RLS; protected writes use authenticated transactional
commands. See [membership and invitation rules](docs/membership.md).

See [authentication setup and verification](docs/authentication.md) for local captured
mail, confirmation/recovery templates, hosted SMTP and redirect configuration.
After upgrading an existing local backend, restart Supabase normally (stop/start,
without a database reset) to load the checked-in email templates. Never reset your
existing backend to run the Auth tests.

Both helpers use the public project key. A server-side request still acts on
behalf of a user and must respect row-level security. The session helper does
not read `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`. Future admin
operations need a separate server-only `@supabase/supabase-js` client without
user cookies or session persistence, behind explicit authorization checks. See
[Supabase's service-role client guidance](https://supabase.com/kb/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z).

Never put a database password, secret key or service-role key in a `NEXT_PUBLIC_`
variable or Docker build argument. The foundation needs only the publishable key.
Keep credentials in `.env.local` or the deployment environment, never in Git.
The actual environment file is ignored by Git, Docker and Vercel uploads.

For host-native development, remove `SUPABASE_INTERNAL_URL` from `.env.local`
and run `npm run dev`. This uses the same local Supabase backend and listens
only on `127.0.0.1`. The development container explicitly listens on `0.0.0.0`
inside Docker, with Compose publishing its port only on host loopback.

### Use a hosted Supabase project during development

Set `NEXT_PUBLIC_SUPABASE_URL` to the hosted project's HTTPS URL and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its public key in `.env.local`. Prefer
a modern `sb_publishable_...` key; an enabled legacy `anon` key is also accepted
under the same variable name. Remove `SUPABASE_INTERNAL_URL` so server requests
use the hosted project too. No service-role or secret key is needed.

Run `npm run dev` to start the app on the host, or recreate the app container if
using Compose. The hosted project supplies the backend. These settings belong
in the ignored `.env.local`; commit only the placeholders in `.env.example`.
See [Supabase's API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

## Verify the foundation

Use `nvm use` (or another version manager) to select the exact `.nvmrc` version.

```sh
npm run check
npx playwright install --with-deps chromium
npm run test:auth
npm run test:db
bash scripts/validate-compose.sh
bash scripts/container-smoke.sh
npm run supabase:check
docker compose exec web npm run supabase:check -- --internal
```

GitHub's **CI / checks** runs `npm ci`, `npm run check`, actual Auth browser tests
and clean/upgrade migrations, generated-type drift and real RLS/command tests
against disposable local Supabase, disposable Compose validation and the final
`linux/amd64` container smoke on every PR to `main`
and every merged `main` revision (including the R2 and R3 stacked PR bases). These
mandatory checks need no hosted account,
`.env.local`, prototypes or cloud credentials. Guard regressions run with `npm test`.
When checking inside the development container, explicitly use production mode:
`docker compose run --rm --no-deps -e NODE_ENV=production web npm run check`.

The connectivity checks use only the public project key, even when a service-role
or secret key is present in the environment. They call Auth health and Auth
settings to verify reachability and key acceptance without creating user data.
They do not verify database queries, table grants, or row-level security policies;
use `npm run test:db` for actual database permissions and migration checks. The
PostgREST root
(`/rest/v1/`) requires admin access and is unsuitable for a public-key check.

The public check uses the address available to the browser; to verify browser
CORS too, open the app, run the following in the browser console with your
**local publishable key**, and expect HTTP 200. For a hosted project, substitute
its HTTPS URL and public key:

```js
await fetch('http://localhost:54321/auth/v1/settings', {
  headers: { apikey: 'YOUR_LOCAL_PUBLISHABLE_KEY' }
}).then(response => response.status)
```

`/api/health` returns `{"status":"ok"}` without contacting Supabase. It remains
available during a backend outage and does not claim that the backend is ready.

### Test the production image

The final stage contains the standalone server, public files and generated
static assets. It runs as the unprivileged `node` user without source mounts.
The Dockerfile is shared with Vercel; there is no separate production Compose
stack. The automated smoke builds with nonproduction placeholder public settings,
starts a fresh container on a random loopback port, checks the actual homepage,
every linked stylesheet, `robots.txt` and the exact health response, and cleans up:

```sh
bash scripts/container-smoke.sh
```

It verifies the image architecture, unprivileged user and absence of mounts.
There is no Supabase dependency or developer environment injection.
The `linux/amd64` build matches
Vercel's runtime; on Apple silicon it can run more slowly through emulation.

Next.js freezes `NEXT_PUBLIC_` values at build time. Rebuild for each environment;
changing only the running container's variables does not change the browser
bundle. Docker builds require both public settings and never need a running
database. Missing application client settings produce an explicit error when a
Supabase helper is first used.

Actions owns gated Vercel container delivery. Trusted previews use an isolated
test backend; production requires successful checks on current, protected,
PR-merged `main`, test delivery, environment approval and a final freshness check.
Git-triggered Vercel deployments are disabled in `vercel.json`; the provider Git
integration must also be disconnected. Reviewed migrations execute before dependent
application delivery, with checksums and serialized test/production ordering. See [deployment/setup/rollback](docs/deployment.md)
for the required check, protected environments, exact variable mapping and setup
status. Hosted delivery is pending provider setup and verification; this PR does
not create accounts or paid services.
