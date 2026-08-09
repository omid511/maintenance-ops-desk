# Contributing

This is a portfolio-quality demo. Keep changes focused on the maintenance
request workflow and preserve server-side authorization, transition checks,
audit events, and the explicit demo/persistent-mode boundary.

## Before opening a pull request

```bash
npm install
npm run typecheck
npm run check:env
npm run lint
npm test
npm run build
```

Use a short imperative commit subject and document schema, auth, or deployment
implications. Never commit `.env*`, database URLs, session secrets, tenant
data, or copied branding/assets.
