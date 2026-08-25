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

## Fallow zero-debt gate

```bash
# Canonical gate surface
pnpm fallow              # Bare CLI passthrough
pnpm fallow:staged       # Pre-commit: staged-diff audit, gate all
pnpm fallow:full         # Zero-debt full scan: dead-code + dupes + health, all failing on issues
pnpm fallow:ci           # Alias of fallow:full used by CI

# Inspection utilities (run without --fail-on-issues; gating flows through fallow:full)
pnpm fallow:config        # Show the resolved repository configuration
pnpm fallow:recommend     # Review configuration recommendations
pnpm fallow:status        # Verify the type-aware companion and protocol
pnpm fallow:dead-code     # Full-repository dead-code probe
pnpm fallow:dupes         # Semantic + near-duplicate probe
pnpm fallow:health        # Complexity and coverage-aware health probe
pnpm fallow:security      # Unverified security candidates for human review
pnpm fallow:suppressions  # Suppression and stale-suppression inventory
```

See [docs/fallow.md](../fallow.md) for gate semantics, dispositions, CI workflows, and configuration. Every gate fails on any finding; there are no baselines or regression scripts. Run `pnpm test:coverage` before `fallow:ci` so its health leg consumes fresh Istanbul output.

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
