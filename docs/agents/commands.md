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

## Fallow adoption gate

```bash
pnpm fallow:config        # Resolved configuration
pnpm fallow:recommend     # Configuration recommendations
pnpm fallow:status         # Type-aware companion status
pnpm fallow:audit          # Fast changed-code new-only gate
pnpm fallow:ci             # Coverage-aware changed-code new-only gate
pnpm fallow:dead-code      # Full-repository advisory inspection
pnpm fallow:dupes          # Semantic + near-duplicate inspection
pnpm fallow:health         # Complexity and coverage-aware health
pnpm fallow:security       # Security candidates for human review
pnpm fallow:suppressions   # Suppression inventory
```

See [docs/fallow.md](../fallow.md) for adoption semantics, CI reporting, configuration, and the zero-debt exit criteria. There are no baseline or regression scripts; existing findings are visible but only newly introduced findings block.

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
file locks, stashes unstaged changes, and runs the read-only Fallow gate concurrently.

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
