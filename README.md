# Maintenance Desk

[![CI](https://github.com/omid511/maintenance-ops-desk/actions/workflows/ci.yml/badge.svg)](https://github.com/omid511/maintenance-ops-desk/actions/workflows/ci.yml)
[![Issues](https://img.shields.io/github/issues/omid511/maintenance-ops-desk)](https://github.com/omid511/maintenance-ops-desk/issues)

Maintenance Desk is a small-landlord service queue: tenants report a problem, landlords make the next action visible, and both sides share an auditable timeline.

## Demo mode

The default demo mode is intentionally database-free. The server seeds two units, a landlord, a tenant, and three requests in memory. Use the role switcher in the top bar to experience both sides. A server-issued `demo_session` cookie identifies the selected demo actor; all request reads and mutations still run through membership and transition checks on the server.

Because the demo adapter is in-memory, a restart resets data. This is useful for a portfolio demo and safe for local evaluation; it is not production persistence. `/api/health` makes the active mode explicit.

The workflow is deliberately operational rather than marketplace-shaped: report → triage → assign → schedule → work → done → tenant acknowledgement → close. Operators can block/escalate a request, leave tenant-visible or internal notes, and tenants can reopen completed work with a reason. Every accepted mutation increments a version and appends an immutable event; stale `expectedVersion` writes return `409`.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Available checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:env
```

## GitHub checks and releases

Pull requests and pushes run the same type, environment, lint, test, and
production-build checks listed above. Dependabot reviews dependency changes,
and CodeQL scans the TypeScript surface on pull requests, pushes to `main`,
and a weekly schedule. A published `v*` GitHub release re-runs verification
and attaches a source archive plus a SHA-256 checksum; verify it with
`sha256sum -c maintenance-ops-desk-<tag>.tar.gz.sha256`.

## Production persistence and auth

The project is configured for Vercel (`vercel.json`) and uses standard Next.js build output. Connect this directory to a Vercel project, set the framework to Next.js, and deploy. No secrets are required for demo mode.

For a persistent deployment:

1. Create a Neon or Supabase Postgres database and set `MAINTENANCE_MODE=postgres`, `MAINTENANCE_AUTH_MODE=production`, `DATABASE_URL`, and `MAINTENANCE_SESSION_SECRET`. Keep `DIRECT_URL` for migration tooling when the provider needs a direct connection.
2. Apply `supabase/migrations/0001_maintenance_desk.sql`, then optionally `supabase/seed.sql` for a controlled demo tenant. The schema covers actors, memberships, units, requests, attachment metadata, notes, and immutable events, with queue/SLA/timeline indexes.
3. Wire a provider client (`pg.Pool` or Supabase server client) to the provider-neutral `createPostgresAdapter` in `src/lib/persistence.ts`. Route code should select this adapter when `MAINTENANCE_MODE=postgres`; keep the in-memory adapter as a deliberate fallback only for `MAINTENANCE_MODE=demo`.
4. Issue signed `maintenance_session` cookies from the real auth provider. The server verifies the HMAC signature and expiry and derives the actor from the session; never accept actor IDs or role claims from request bodies.

Reset the local/demo dataset by restarting the dev server. For a shared database, reset only a disposable environment with a reviewed SQL transaction; do not run a destructive reset against production.

## Deployment runbook

```bash
npm install
npm run typecheck && npm run lint && npm test && npm run build
# verify the active configuration after deploy
curl -i https://YOUR_DOMAIN/api/health
```

The GitHub Actions workflow runs the same install, checks, and build on pushes and pull requests. Vercel previews should use demo mode unless a preview database and verified auth provider are explicitly configured.

## Product boundaries

This MVP deliberately excludes property search, maps, applications, leases, payments, AWS integrations, public file uploads, and copied branding/assets. Attachments are metadata-only until a provider-neutral private storage adapter is added.
