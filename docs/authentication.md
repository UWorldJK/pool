# Authentication

R2 implements adult email/password signup, email confirmation, sign-in, sign-out,
password recovery/reset, and a protected empty `/app`. It creates no application
tables, RLS policies, families, circles, rides, OAuth providers or admin session
client. Adult signup includes a required self-attestation; it is not age verification.

## Session and redirect behavior

All normal Supabase clients use the public project key. The server-only
`SUPABASE_INTERNAL_URL` override and shared `pool-auth` cookie name remain intact.
Server clients are created per request; no identity/session is shared in a module
singleton. The proxy calls `getUser()`, propagates refreshed cookies to the current
request and the response, preserves SDK cache headers and deletions, and redirects
unauthenticated `/app` requests. The application layout and password mutation
independently verify identity using `getUser()`, requiring a confirmed email and
rejecting anonymous accounts. Cookie user data and `getSession()` are never authority.

`createReadOnlyClient()` is for Server Components: it intentionally does not write
cookies; proxy refresh runs first. `createClient()` is for writable actions/handlers
and lets cookie-write failures surface. Auth fetches use `cache: no-store`.
Auth/application routes force dynamic rendering and send private/no-store headers
for browser and CDN caches, including actions, redirects and `Set-Cookie` responses.
Do not add ISR, a shared response cache or a shared authenticated client to these
routes. The homepage, static assets and `/api/health` bypass Auth; health still
means application liveness, not backend readiness.

`next` accepts only normalized `/app` paths, including internal query strings.
External, protocol-relative, malformed, encoded traversal and control-character
paths fall back to `/app`. Email destinations use Supabase's configured Site URL,
never incoming Host/Origin/forwarded headers. Each hosted project therefore has one
canonical origin for email links, even if a preview was opened at another URL.

Mail opens `/auth/confirm?token_hash=…&type=signup` or `type=recovery`. GET only
displays a confirmation form; POST verifies the single-use hash using `verifyOtp`.
This avoids consuming links on ordinary email scans/prefetches and permits opening
the configured token-hash link in another browser. Recovery always goes to
`/reset-password` after verification. Invalid/expired/used links go to `/auth/error`
with retry links; arbitrary provider error text is never reflected. Link pages and
the PKCE compatibility callback send `Referrer-Policy: strict-origin`, which omits
token queries from referrers while preserving same-origin Server Action checks. Do not log
email-link queries or record them in analytics. An explicit click is still needed;
a scanner that submits forms can consume a link.

`/auth/callback` supports confirmation codes with `exchangeCodeForSession`; it needs
the original browser's PKCE verifier. Missing/used/invalid codes fail closed. The
shipped recovery template uses token hashes, not this compatibility callback.
An already verified signed-in account can also visit `/reset-password` to choose a
new password. The mutation revalidates identity, then requests global sign-out;
regular sign-out uses local scope. Supabase access JWTs can remain valid until their
expiry after global sign-out; refresh tokens are revoked. A failed sign-out is
shown explicitly. Sign-in and recovery never expose raw provider errors, and
recovery gives the same success message for unknown emails.

## Local development

`supabase/config.toml` enables email confirmation. The checked-in templates are
`auth/email/confirmation.html` and `auth/email/recovery.html`. They use `.SiteURL`
and `.TokenHash`; do not replace them with an implicit-flow URL carrying tokens
in a fragment. Supabase's default Site URL is `http://localhost:3000`; the captured
mail inbox is `http://localhost:54324`. No external SMTP delivery is configured.

Start with the README instructions. For an already running backend, load changed
Auth/template configuration using normal stop/start; existing Docker volumes are
preserved. Do not run a database reset. Open `/sign-up`, create an adult test account,
open its captured email, click **Confirm email**, and reach `/app`. Use the same
hostname throughout app navigation. Docker's internal URL is only for server API
traffic; it must never appear in email links. If changing the app port/origin,
update local `site_url` and the explicit callback redirect allowlist too.

Passwords accepted by the app are 12–128 characters. Configure hosted Supabase's
minimum length to 12 as well; the public Auth API is independently reachable.
Local normal link lifetime uses Supabase's default (one hour). The short expiry
and relaxed rate limits below apply only to the generated disposable test project.

## Mandatory local and CI tests

Use Node from `.nvmrc`, Docker and Chromium:

```sh
npm ci
npx playwright install --with-deps chromium
npm run check
npm run test:auth
bash scripts/validate-compose.sh
bash scripts/container-smoke.sh
```

`test:auth` creates a fresh uniquely named CLI project in temporary storage on
55320–55329 and an isolated loopback network. It never resets/stops the developer's
`pool` project. It copies the real local configuration/templates, changes only test
ports, Site URL (`http://localhost:3100`), JWT/link expiry and local rate limits,
and disables unused services. The app is built with that project's public key and
started on port 3100. The test harness reads only the CLI's public key; it never
uses an admin key to create or confirm users. All accounts are created through the
actual browser form and confirmation/recovery mail is read from local Mailpit.
No option permits targeting a hosted backend, and inherited admin keys/internal
URLs are cleared for the application. These tests cannot send production emails.

The browser tests cover two independent users and HTML/RSC isolation, unconfirmed
and unauthenticated access, real PKCE exchange/replay/missing verifier, malformed/forged
cookies, a genuinely expired signed JWT with an invalid refresh token, real refresh
token rotation with request/response propagation, direct protected requests,
return-path attacks, sign-out, password replacement, reused and genuinely expired
confirmation/recovery links, public/static availability, keyboard order and mobile
reflow. Helper regressions exercise the actual server/proxy/actions at SDK/framework
boundaries, including cookie-write restrictions, error handling, public/internal
URLs, cache policy and identity validation. They complement the real round trip.

The harness removes only its own containers/volumes/network and temporary mailbox
results on exit. Browser traces/screenshots are disabled to avoid recording tokens.
If forcibly killed before cleanup, stop only the printed test project using its
temporary work directory and `supabase stop --no-backup --workdir <test-directory>
--network-id <test-network>`; never prune all volumes. Ports must be free; an
existing process is not reused. The app build is overwritten with local test public
settings, so rebuild for your normal environment afterward.

## Hosted test and production owner configuration

R1's separate test and production Supabase/Vercel projects, public settings and
protected delivery environments are prerequisites. No SMTP credentials belong in
the app, public variables, build arguments or repository. Configure SMTP in each
Supabase project's Auth settings using an approved sender/domain and provider.
Verify sender authentication and provider delivery logs. Keep test recipients
synthetic/approved; automated CI never uses hosted projects. Provider purchases,
accounts and production email sends are separate owner actions.

For **each** project:

1. Keep Email/password enabled, **Confirm email** enabled, and anonymous sign-in
   disabled. Set minimum password length to 12. Retain normal hosted rate limits
   and a suitable link lifetime (one hour initially); never copy the test limits.
2. Set Site URL to that environment's canonical HTTPS app origin. In isolated
   test, use a stable trusted test deployment domain with test public settings;
   in production, use the real production domain. Add only the exact canonical
   `/auth/callback` URLs needed for PKCE confirmation. Do not allow broad wildcard
   production redirects or a production origin in the test project. The token-hash
   templates use Site URL directly, so arbitrary immutable previews are not email
   destinations. Origin changes require updating both project settings and mail.
3. Copy the contents of `auth/email/confirmation.html` into **Confirm signup** and
   `auth/email/recovery.html` into **Reset password**. Use `.SiteURL` and `.TokenHash`
   exactly; disable email click tracking that rewrites one-time links. Do not paste
   real tokens into documentation/issues. Check email content and HTTPS link origin.
4. Configure SMTP credentials/sender in Supabase, and confirm the canonical test
   origin is reachable from the email browser. Deployment protection may require
   approved test access; a bypass credential must never appear in mail or app URLs.
5. On isolated hosted **test**, manually create an approved synthetic account,
   receive/confirm mail, sign in, reload/refresh, use a second account/context,
   sign out, recover/reset via delivered mail and check an expired/used link. Verify
   private/no-store headers at the deployed CDN and absence of cross-user payloads.
   Record revision, origin, SMTP sender and observed results without credentials.

Local template changes do not update hosted settings. Delivery permits only the exact
reviewed local Auth-mail suffix above the foundation config, plus canonical
versioned migrations through the R3 executor. Other Supabase configuration changes
remain blocked. CI changes must merge before preview delivery; stacked checks do
not authorize a hosted release.

Sources: [Supabase SSR clients and caching](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs),
[SSR session details](https://supabase.com/docs/guides/auth/server-side/advanced-guide),
[mail templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Verification record

Local validation on October 26, 2026 (America/Denver):

| Check | Observed result |
| --- | --- |
| Fresh Node 24.22.1 Linux container, without `.env.local` or prototypes | `npm ci` and `npm run check` passed: lint, types, all 49 regressions, production build. |
| Real local Supabase + standalone production app + Chromium | All six browser tests passed, including two users, refresh cookies, real JWT/link expiry, PKCE, recovery and sign-out. |
| Compose and final `linux/amd64` production container | Passed disposable configuration validation and homepage/CSS/robots/health smoke with placeholder public settings and no backend dependency. |
| Workflow and diff checks | actionlint 1.7.12 passed with only its unsupported existing `queue` diagnostic excluded; `git diff --check` passed. |

The PR records hosted CI results at its exact head revision. Hosted test
SMTP delivery, canonical origins, deployed refresh/CDN isolation and production
configuration remain **pending owner/provider setup and a real hosted test run**.
No production mail or deployment is claimed by the local browser suite.
