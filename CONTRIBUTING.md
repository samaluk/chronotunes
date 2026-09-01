# Contributing to ChronoTunes

Thank you for taking the time to contribute. ChronoTunes welcomes focused pull
requests while its public release and deployment story are still developing.

## Before you start

Read the README and check existing issues before opening a pull request. Keep changes
focused, explain the user-visible effect, and avoid adding bundled audio or
publisher-curated catalog data. Do not include credentials or private deployment
configuration in commits.

## Local workflow

Install the pinned toolchain and dependencies, then start the app as described in the
README:

```bash
mise install
hk install --global
pnpm install
pnpm dev
```

Before submitting, run:

```bash
pnpm check
pnpm next:typegen
pnpm convex:typegen
pnpm test:once
pnpm build
```

Add or update focused tests for behavior changes. Convex behavior belongs in the
corresponding `convex/*.test.ts` suite; UI behavior should use the existing component
test conventions.

## Pull requests

Describe the problem, the change, and how you verified it. Keep commits and scope
small enough to review. Pull requests are checked automatically on GitHub-hosted
Ubuntu runners. A maintainer may ask for changes before merging.

This project does not currently promise a supported self-hosted deployment, public
catalog importer, or community governance process.
