# Architecture

```text
tenant browser / landlord browser
              |
              v
       Next.js route handlers
              |
     session + membership checks
              |
              v
        domain transitions
              |
       idempotency + versions
              |
       adapter boundary ----------------> demo memory adapter
              |                           Postgres adapter
              v
        requests / notes / events / memberships
```

Every mutation is authorized on the server, checks the current membership and
state, and appends an immutable event. Client request IDs make retrying a
mutation safe; optimistic versions reject stale writes with `409`. The default
adapter is intentionally in-memory for a fast public demo. The Postgres schema,
session contract, and deployment runbook define the persistent path without
pretending that demo mode is production persistence.

## Deliberate trade-offs

- A small state machine is easier to review than a generic workflow engine for
  this domain.
- Attachments are metadata-only until a private storage adapter is connected.
- Demo sessions provide a runnable two-sided workflow, while production auth is
  an explicit provider integration rather than a hard-coded credential flow.
