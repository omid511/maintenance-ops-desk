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

## Workflow action policy

GitHub Actions use maintained major tags such as `@v4` rather than floating
branches or unpinned commits. This keeps routine upstream security fixes
available while Dependabot tracks major-version updates for review. Changes to
workflow permissions should stay least-privilege and be explained in the pull
request.
