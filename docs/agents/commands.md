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

## Pre-commit (must pass)

```bash
pnpm check
pnpm next:typegen
pnpm convex:typegen
pnpm test
```

## CI / self-hosted runners

CI runs on GitHub-hosted `ubuntu-latest` by default. To opt into a self-hosted runner, set repository variables under **Settings → Actions → Variables**:

| Variable | Value |
| --- | --- |
| `USE_SELF_HOSTED_RUNNERS` | `true` to enable |
| `SELF_HOSTED_RUNNER_LABELS` | (optional) JSON array, e.g. `["self-hosted", "macOS"]` |

Leave `USE_SELF_HOSTED_RUNNERS` unset to keep using `ubuntu-latest`.
