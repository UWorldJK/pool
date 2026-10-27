# Deployment

## Manual Vercel container deployment

Vercel's [container runtime](https://vercel.com/docs/functions/runtimes/container)
is currently beta. Its `Dockerfile.vercel` detection builds the image, stores it
in Vercel Container Registry and routes requests to the container. Keep this as
one application; Supabase remains a separate managed backend.

1. Create a hosted Supabase project when ready to deploy. Get its HTTPS project
   URL and publishable key from the Connect dialog. Local Docker addresses and
   local keys cannot be used in a hosted deployment.
2. Run `npx vercel login`, then `npx vercel link` from the repository root. Create
   or link the Vercel project without importing a Git repository. This keeps
   deployments manual. Use the repository root as the project directory and the
   Container preset if framework selection is requested; do not override it with
   a native Next.js build command.
3. In Vercel's project environment settings, set the two `NEXT_PUBLIC_SUPABASE_`
   values for the intended deployment environment. Make them available at build
   time and runtime. The Dockerfile declares only these two public build
   arguments. Set `PORT=3000`; the container sets `HOSTNAME=0.0.0.0` itself.
   Leave `SUPABASE_INTERNAL_URL` unset.
   Use the public project key for both browser and session-based server clients;
   the foundation does not need a service-role or secret key. Keep actual values
   out of Git and commit only `.env.example` placeholders.
4. Run `npx vercel deploy --prod` for the first production deployment. Vercel
   builds the final Dockerfile stage for `linux/amd64`. Save the deployment URL
   and confirm the homepage, CSS, `/robots.txt` and `/api/health` are served.
5. Check container logs for startup errors and verify that the hosted project
   URL is used. No local Supabase address should be present in the browser's
   downloaded assets. The app is a foundation landing page; sign-in and ride
   actions will be implemented in later changes.

Do not bake privileged Supabase keys, database passwords or Vercel tokens into an
image. Do not upload `.env.local`. The ignore rules exclude environment files,
local Supabase state, prototype exports and development dependencies.

The app container is stateless. Store future persistent data in Supabase, not in
the container filesystem or process memory. Database migrations are a separate
release step and never run when the web container starts.

Once authentication is implemented, configure Supabase's site/redirect URLs for
the deployed origin, add the standard SSR refresh proxy, and configure real
email delivery. Local Supabase's captured inbox does not deliver real messages.

## Rollback

Use Vercel's deployment history to select the last healthy production deployment
and choose **Instant Rollback**, or run `npx vercel rollback <deployment-url>`
with that verified deployment URL. Recheck the homepage and health endpoint.
This rolls back application code, not database changes. Future migrations should
remain compatible with the previous application version during a rollout.

After a rollback, Vercel disables automatic assignment of production domains.
New production deployments can build successfully while the production domain
continues serving the rolled-back version. To resume releases, deploy the fix
and verify its deployment URL, then run
`npx vercel promote <fixed-deployment-url>`. Alternatively, choose **Undo Rollback**
in the Vercel dashboard and select that verified fixed deployment. Promotion
restores automatic production-domain assignment for future releases. Confirm
that the production domain now serves the fixed version and recheck its
homepage and `/api/health`. See Vercel's
[rollback recovery documentation](https://vercel.com/docs/cli/rollback#undo-a-rollback).

## Costs

As checked October 23, 2026:

- [Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to personal,
  noncommercial use. [Pro](https://vercel.com/docs/plans/pro-plan) starts at
  $20/month with one deploying seat; additional deploying seats are $20/month
  each. Usage and container-registry storage can add charges.
- [Supabase Free](https://supabase.com/pricing) supports early development, with
  project limits and pausing after inactivity. Pro starts at $25/month with the
  first project included and adds features such as daily backups.

Local Supabase has no hosted database bill. Start with one hosted project when
manual deployments are needed. Add a separate hosted test project when previews
are enabled. Configure provider spending alerts before adding paid usage; this
change does not create accounts, subscribe to plans or enable external services.

## CI/CD later

No workflow or automatic deployment is enabled by this foundation.

The next automation change should:

1. Run `npm ci`, lint, type checking and relevant tests on pull requests. Build
   the production Docker image with test public settings and smoke-test it
   without development mounts.
2. Connect Vercel's Git integration to the repository, using `main` for
   production. Keep the container deployment path. Require the checks before
   merging to `main`; let Vercel build and deploy the merged revision.
3. Point preview builds at a separate hosted Supabase test project. Localhost
   cannot serve cloud previews, and previews must not use production data. A
   shared test project is sufficient initially; do not create a database per PR.
4. Once database migrations exist, add an ordered release step to apply reviewed
   migrations before code that depends on them. Keep resets and demo data local.

Vercel's built-in container build and registry are enough. There is no need for
another image registry, deployment server, Kubernetes, message queue or custom
release system for this foundation.
