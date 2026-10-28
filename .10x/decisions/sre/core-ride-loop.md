# SRE: core-ride-loop

Local only; no SLOs yet. Before hosting:
* Watch Supabase Auth email failures (sign in depends on them) and `/api/health`.
* Server logs: Server Actions log only status and error code for auth failures; unexpected database errors surface as the generic message to users.
* Ride day is the critical window: a failed pickup or handoff action leaves the ride in progress. The Activity log is the audit trail for support.
