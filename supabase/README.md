# Postgres/Supabase runbook

1. Create a disposable project or Neon database.
2. Set `DATABASE_URL` and, when migration tooling needs it, `DIRECT_URL`.
3. Apply `migrations/0001_maintenance_desk.sql` with `supabase db push` or `psql "$DIRECT_URL" -f supabase/migrations/0001_maintenance_desk.sql`.
4. Seed only a non-production environment with `psql "$DIRECT_URL" -f supabase/seed.sql`.
5. Set `MAINTENANCE_MODE=postgres`, `MAINTENANCE_AUTH_MODE=production`, and a long random `MAINTENANCE_SESSION_SECRET`.
6. Verify `GET /api/health` reports `ok: true`, `persistence: postgres`, and `auth: production`.

The migration keeps event rows append-only by application convention: request mutations use a version predicate. When wiring a provider client, wrap the versioned request update and event insert in one database transaction. Do not run a reset against production. To reset a disposable database, drop/recreate its schema, reapply the migration, and seed again.
