# DevOps: core-ride-loop

Not deployed (local only, by Sam's decision). When hosting:
1. Rotate the hosted service role key (leaked in Slack).
2. `supabase link` to the hosted project, then `supabase db push` for the three migrations. No backfill.
3. In the hosted dashboard: magic link and confirmation templates pointing at `/auth/confirm?token_hash={{ .TokenHash }}&type=email`, site URL and redirect URLs for the deployed origin, custom SMTP (Resend).
4. Deploy with the existing manual Vercel flow in `docs/deployment.md`.
5. Add CI: `npm run check`, `npm run db:test` against a disposable Supabase, Playwright against a preview with a test project.
