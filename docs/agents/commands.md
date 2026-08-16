# Commands

## Development

```bash
pnpm dev                    # Start Next.js dev server
just run-local-backend      # Start local Convex backend (Terminal 1)
just convex dev             # Deploy to local backend (Terminal 2)
```

## Linting and formatting (Oxlint + Oxfmt)

```bash
pnpm check                  # Lint (oxlint) and verify format (oxfmt --check)
pnpm fix                    # Apply safe oxlint fixes and format with oxfmt
just lint                   # Same as pnpm check
just fix                    # Same as pnpm fix
pnpm exec oxlint --print-config   # Print resolved Oxlint configuration
```

## Fallow quality ratchet

```bash
pnpm fallow:ci              # Full CI gate (version + freshness + Gate A + Gate B)
pnpm fallow:audit           # Changed-code gate (type-aware, new-only) — pre-commit gate
pnpm fallow:status          # Type-aware companion status
pnpm fallow:regression      # Gate B: regression counts + completeness watch
pnpm fallow:security        # Advisory security candidates
pnpm fallow:suppressions    # Inventory of active fallow-ignore markers
pnpm fallow:baseline:update # Regenerate exact + regression baselines after genuine fixes
pnpm fallow:baseline:check  # Fail if committed baselines are stale
```

See [docs/fallow.md](../fallow.md) for Gate A/B details and inspection commands.

## Type generation

```bash
pnpm next:typegen           # Generate Next.js types
pnpm convex:typegen         # Generate Convex types
```

## Testing

```bash
pnpm test                   # Run all tests (vitest)
pnpm test <file>            # Run a single test file
pnpm test <pattern>         # Run tests matching pattern
pnpm test --watch           # Watch mode
```

## Workflow support

```bash
pnpx --yes frog@1.0.15 list  # Validate the unresolved friction inbox
```

## Git hooks (hk)

```bash
mise install                 # Install the pinned hk version
hk install --global          # Install hooks once for all hk-enabled repositories
hk check --all               # Check all repository files without modifying them
hk fix --all                 # Fix all repository files
hk run pre-commit --all      # Exercise the configured pre-commit hook
```

The pre-commit hook uses hk's built-in Oxfmt and Oxlint integrations, coordinates fixes with
file locks, stashes unstaged changes, and runs the changed-code Fallow audit concurrently;
pre-push runs the full `pnpm fallow:ci` ratchet.

## Pre-commit (must pass)

```bash
pnpm check
pnpm next:typegen
pnpm convex:typegen
pnpm test
```

## CI / self-hosted runners

Each workflow job declares its own `runs-on` under **.github/workflows/**, gated on the `USE_SELF_HOSTED_RUNNERS` repository variable (**Settings → Actions → Variables**):

| Variable                  | Value                             |
| ------------------------- | --------------------------------- |
| `USE_SELF_HOSTED_RUNNERS` | `true` to use self-hosted runners |

When enabled, jobs route to the `[self-hosted, docker]` container runners (node24 toolchain); fork PRs always fall back to GitHub-hosted `ubuntu-latest`. When disabled (or the variable is unset), jobs use GitHub-hosted runners — `ubuntu-slim` for light jobs (`actionlint`, `friction-log`), `ubuntu-latest` for CI/build/agent jobs (`ci-reusable`, `pullfrog`).
