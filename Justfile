# ChronoTunes - Development Commands
# Requires: just (https://github.com/casey/just)

# Default recipe shows available commands
default:
    @just --list

# Start the local Convex OSS backend (Terminal 1)
run-local-backend:
    npx convex backend --port 3210

# Deploy Convex functions to local backend (Terminal 2)
convex *ARGS:
    CONVEX_DEPLOY_KEY="" npx convex {{ARGS}} --url http://127.0.0.1:3210

# Push Convex schema and functions to local backend
push:
    just convex push

# Run Convex code generation
codegen:
    just convex codegen

# Open Convex dashboard for local backend
dashboard:
    just convex dashboard

# Start Next.js development server
dev:
    pnpm dev

# Run all tests
test:
    pnpm test

# Type check the entire project
typecheck:
    pnpm next:typegen && pnpm convex:typegen && tsc --noEmit

# Lint and format check
lint:
    pnpm biome check .

# Auto-fix lint and format issues
fix:
    pnpm biome check . --write

# Build for production
build:
    pnpm build

# Full setup: run local backend, deploy, and start dev server
# Run each command in a separate terminal
setup:
    @echo "1. Terminal 1: just run-local-backend"
    @echo "2. Terminal 2: just convex dev"
    @echo "3. Terminal 3: just dev"
