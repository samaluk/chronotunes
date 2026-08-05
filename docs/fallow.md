# Fallow quality ratchet

ChronoTunes uses [Fallow](https://docs.fallow.tools) 3.14 with type-aware TypeScript analysis as a strict quality ratchet. Existing technical debt is baselined; new debt is rejected.

## Two baseline layers

### Exact baselines (`fallow-baselines/*.json`)

Identity-based snapshots of current findings:

| File             | Analysis                                    | Matching mode         |
| ---------------- | ------------------------------------------- | --------------------- |
| `dead-code.json` | Unused code, deps, private type leaks       | Per finding identity  |
| `dupes.json`     | Semantic clone groups (`minOccurrences: 3`) | Per clone fingerprint |
| `health.json`    | Complexity, CRAP, unit size                 | Per function identity |

**Gate A** fails when a finding appears that is not in the committed baseline — even if total count stays the same. Example: remove one unused export and add a different one → CI fails.

### Regression baseline (embedded in `.fallowrc.json`)

The `regression.baseline` block stores issue **counts** from a known-good state. It is written by:

```bash
pnpm exec fallow dead-code --save-regression-baseline
```

with no path argument (updates `.fallowrc.json` in place).

**Gate B** fails when total dead-code issue count increases beyond tolerance (zero):

```bash
pnpm fallow:regression
# runs scripts/fallow-regression-check.mjs, which reads regression.baseline from .fallowrc.json
```

Fallow exits 1 whenever issues exist; the wrapper parses JSON and fails only when `regression.exceeded` is true.

Regenerating a worse baseline to silence CI is not acceptable — fix the code or justify narrow config changes.

## Type-aware analysis

Enabled in `.fallowrc.json` via `typeAware.enabled: true` with `require: best-effort`. Projects:

- `tsconfig.json` — production sources
- `tsconfig.tests.json` — Vitest and Convex tests
- `convex/tsconfig.json` — Convex functions

`best-effort` keeps type-aware refinement on while a handful of candidates abstain (`unsupported_syntax` / dynamic-behavior). Flip-x can use `require: complete`; ChronoTunes stays on best-effort until those abstentions clear. Type-aware analysis does **not** replace `tsc` or Oxlint.

Check companion status:

```bash
pnpm fallow:status
```

## Enabled analyses

**Dead code:** unused files/exports/types/deps, enum/class members, server actions, unresolved imports, circular deps, re-export cycles, stale suppressions, private type leaks (warn).

**Duplication:** semantic mode, `minLines: 8`, `minTokens: 60`, `minOccurrences: 3`, import wiring excluded. Focuses on meaningful copy-paste, not shadcn or test boilerplate.

**Health:** cyclomatic (20), cognitive (15), CRAP (30), unit size (60). Identity baseline tracks per-function hotspots. Use `--hotspots`, `--targets`, `--ownership`, `--type-coupling` for inspection.

## Commands

```bash
pnpm fallow:dead-code      # Gate A: dead-code exact baseline
pnpm fallow:dupes          # Gate A: duplication exact baseline
pnpm fallow:health         # Gate A: health identity baseline
pnpm fallow:regression     # Gate B: embedded count regression
pnpm fallow:audit          # Changed-files review (new-only gate)
pnpm fallow:ci             # Full CI gate (freshness + A + B on full repo)
pnpm fallow:baseline:update   # Regenerate all baselines after genuine fixes
pnpm fallow:baseline:check    # Fail if committed baselines are stale
pnpm fallow:fix:preview    # Type-aware dry-run fixes
pnpm fallow:fix            # Apply safe fixes (not run in CI)
```

## Inspecting findings

```bash
# Why is an export flagged?
pnpm exec fallow dead-code --trace src/i18n/routing.ts:usePathname

# Exact TypeScript consumers
pnpm exec fallow dead-code --type-aware --symbol-impact src/lib/timeline.ts:buildTrackMap

# Duplication fingerprint
pnpm exec fallow dupes --trace dup:57820f45

# Health hotspots and targets
pnpm exec fallow health --hotspots --targets --ownership

# Explain an issue type
pnpm exec fallow explain private-type-leak
```

## Updating baselines after improvements

When you remove findings legitimately:

```bash
pnpm fallow:baseline:update
pnpm fallow:baseline:check
git add .fallowrc.json fallow-baselines/
```

`baseline:update` writes exact baselines to `fallow-baselines/` and embeds regression counts in `.fallowrc.json`.

Generate baselines without a local `coverage/` directory (or other Istanbul artifacts). CRAP scores change when coverage is present, which makes CI freshness checks fail on runners that have no coverage data.

CI also expects improved baselines to be committed — `fallow:baseline:check` regenerates into a temp workspace and diffs.

## Configuration exclusions

| Pattern                                                        | Reason                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ignoreFindings: convex/_generated/**`                         | Hide dead-code noise; files stay in graph for import resolution           |
| `ignoreExports: src/components/ui/*.tsx`                       | shadcn re-exports full component API                                      |
| `ignoreExports: src/i18n/routing.ts:usePathname`               | next-intl `createNavigation` destructuring breaks type-aware completeness |
| `ignoreUnresolvedImports: ../../messages/**`                   | Dynamic locale JSON imports resolved at build time                        |
| `ignoreDependencies: tailwindcss, shadcn, oxlint, …`           | Tooling/CSS/import-script deps not imported as app modules                |
| `ignorePatterns: oxfmt/oxlint/vitest/next configs, scripts/**` | Tooling entrypoints outside the app graph                                 |

## CI behavior

On pull requests, `pnpm fallow:ci`:

1. Verifies Fallow 3.14.0 and type-aware companion
2. Runs `fallow:baseline:check` so committed exact + regression baselines are not stale
3. Runs Gate A (exact baselines on the full repo)
4. Runs Gate B via `scripts/fallow-regression-check.mjs` (parses JSON; fails only when `regression.exceeded` is true)

`pnpm fallow:audit` remains available for local changed-file review. It is not in CI today because type-aware baselines currently fail audit identity checks (`capabilities` mismatch in Fallow 3.14.0).
