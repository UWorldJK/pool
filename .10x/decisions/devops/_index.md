# DevOps decisions

* [DISCOVERED] Local: Supabase CLI owns backend containers on the `pool-local` network; Compose runs only the app. Host development with `npm run dev` also works.
* [DISCOVERED] Production: `Dockerfile.vercel`, Vercel container runtime, manual deploys, no CI yet (`docs/deployment.md`).
* [DISCOVERED] Migrations are a separate release step, never run at container start.
