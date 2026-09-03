# ChronoTunes - Development Commands
# Requires: just (https://github.com/casey/just)

# Default recipe shows available commands
default:
    @just --list

# Start the local Convex OSS backend (Terminal 1)
convex:
    pnpx convex dev --local

# Push Convex schema and functions to local backend
push:
    just convex push

# Run Convex code generation
codegen:
    just convex codegen

# Seed the local database with test data
seed:
    just convex run seed

# Import a catalog from a Spotify playlist URL or ID
import-spotify url flags="":
    pnpm import:spotify {{url}} {{flags}}

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
    pnpm check

# Auto-fix lint and format issues
fix:
    pnpm fix

# Build for production
build:
    pnpm build

# Full setup: run local backend, deploy, and start dev server
# Run each command in a separate terminal
setup:
    @echo "1. Terminal 1: just run-local-backend"
    @echo "2. Terminal 2: just convex dev"
    @echo "3. Terminal 3: just dev"
