# Commands

## Development
```bash
pnpm dev                    # Start Next.js dev server
just run-local-backend      # Start local Convex backend (Terminal 1)
just convex dev             # Deploy to local backend (Terminal 2)
```

## Linting and formatting (Biome)
```bash
pnpm biome check .          # Lint and format check
pnpm biome check . --write  # Auto-fix lint and format issues
pnpm biome format .         # Format only
```

## Ultracite
```bash
pnpm dlx ultracite fix      # Auto-fix using Ultracite
pnpm dlx ultracite check    # Check for issues
pnpm dlx ultracite doctor   # Diagnose setup
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
pnpm test:integration       # Integration tests against local backend
```

## Pre-commit (must pass)
```bash
pnpm biome check .
pnpm next:typegen
pnpm convex:typegen
pnpm test
```
