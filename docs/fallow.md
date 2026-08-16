# Fallow quality ratchet

ChronoTunes uses [Fallow](https://docs.fallow.tools) 3.16.0 with type-aware TypeScript analysis as a strict, continuously improving quality ratchet: existing technical debt is baselined, new debt is rejected, and committed baselines must only move downward.

## 1. Purpose / quality-ratchet model

Fallow analyzes the whole project graph (unused code, duplication, complexity, architecture boundaries). The ratchet has four complementary guarantees:

| Gate                       | Mechanism                                                                                    | Fails when                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **A — exact baselines**    | Identity-matched baselines in `fallow-baselines/*.json`                                      | A finding appears that is not in the committed baseline — even if the total count stays the same                             |
| **B — regression counts**  | Embedded `regression.baseline` in `.fallowrc.json` (written by `--save-regression-baseline`) | Dead-code issue counts grow beyond the committed totals (zero tolerance)                                                     |
| **B — completeness watch** | `_meta.type_aware.abstained_count` from the type-aware run                                   | The semantic sidecar abstains on any query (`require: complete` already fails such runs; this watch names the cause clearly) |
| **D — baseline freshness** | `scripts/fallow-baseline-check.mjs` regenerates into a temp workspace and diffs              | Code improved but the committed baselines did not improve with it                                                            |

Together these create a one-way ratchet: **worse → fails analysis; better but baseline unchanged → fails freshness; better + baseline reduced → passes**. Regenerating a worse baseline to silence CI is never acceptable.

## 2. Fallow version

Pinned exactly in `package.json` (`devDependencies.fallow`). The local binary (`pnpm exec fallow`) is the same version CI runs — `pnpm fallow:ci` refuses to proceed when the installed CLI does not match the pin. The GitHub Action resolves the same pin. Keep the vendored agent skill in `.agents/skills/fallow/` in sync with the installed package (`rm -rf .agents/skills/fallow && cp -R node_modules/fallow/skills/fallow .agents/skills/fallow`, then re-add the repo-notes section).

## 3. Enabled analyses

**Dead code** (`fallow dead-code`): unused files/exports/types/deps, private type leaks (**error** — 36 baselined; new leaks fail CI), stale suppressions, unresolved imports, circular deps, re-export cycles, duplicate exports, boundary violations, catalog/override hygiene. Suppression hygiene: `require-suppression-reason: error` — every `fallow-ignore-*` marker must carry a reason.

**Duplication** (`fallow dupes`): semantic mode (Type-2 renamed-variable detection), near-miss detection (`duplicates.near: true` for function-scoped clones with small structural edits), `minLines: 8`, `minTokens: 60`, `minOccurrences: 3` (pair-only clones are below threshold: 70 groups — raising the threshold keeps the report actionable), import wiring excluded. Clone groups carry `spread` (rank with `--top`) and near groups carry `similarity`. No `ignoredClones` are configured: the shadcn UI boilerplate groups stay visible in reports so the real groups (`convex/bets.ts` ↔ `convex/rounds.ts`, test factories) are not buried by blanket suppression.

**Health** (`fallow health`): cyclomatic (20), cognitive (15), CRAP (30), unit size (60), health score, file scores, hotspots, refactoring targets, ownership, type coupling, coverage gaps. Thresholds are the fallow defaults — deliberately not loosened; debt is baselined instead.

**Boundaries** (`fallow list --boundaries`): custom zones matching the actual architecture, enforced at error severity with `coverage.requireAllFiles: true`.

**Security** (`fallow security`): opt-in advisory candidate surfacing. Candidates are _verification requests_ for agents/humans, not deterministic violations — they never gate CI. Currently 2 `open-redirect` candidates (`window.location.href` with dynamic paths in `src/app/landing-page-content.tsx`). Verify and fix them in the normal code-review flow.

**Styling/CSS**: `css-token-drift`, `css-duplicate-block`, `css-selector-complexity`, `css-dead-surface`, `css-broken-reference` run at their default `warn` severity (advisory; reportable via `fallow health --css`).

**Feature flags** (`fallow flags`): not applicable — the app uses no feature-flag library or config-toggle pattern.

**Rule packs** (`rulePacks`): not used — the architectural invariants this repo actually has are expressed by the boundary zones; an artificial pack would add no signal.

## 4. Type-aware configuration / completeness

```jsonc
"typeAware": {
  "enabled": true,
  "require": "complete",
  "projects": ["tsconfig.json", "tsconfig.tests.json", "convex/tsconfig.json"]
}
```

All three TypeScript projects are selected: the Next.js app, the Vitest test project, and the Convex backend. `require: "complete"` makes incomplete semantic evidence fail the run, and it is supportable because the analysis is genuinely complete: `fallow dead-code --type-aware --format json` reports `_meta.type_aware.identity.completeness: "complete"` with `abstained_count: 0`.

This was not always true. The type-aware pass used to abstain on 2 candidates (`BetCoinState`, `TimelineEntry`) with `dynamic-behavior`, caused by the non-literal dynamic import in `src/i18n/request.ts` (`import(`../../messages/${locale}.json`)`): the sidecar's `recordDynamicImportUncertainty` marks **every** project export as uncertain when it sees a non-literal dynamic import, making every symbol-use query partial. The import was replaced with static per-locale imports (`messagesByLocale`), which also surfaced and fixed a latent i18n gap (the `es` catalog was missing `betting.beforeYear/afterYear/betweenYears`). Two unused type exports that were previously "retained with abstention" became confirmed-unused and were removed.

Gate B's completeness watch (max 0 abstained queries) still runs as a belt-and-suspenders check with a clearer message than the raw `require: complete` failure. Evidence: `pnpm exec fallow dead-code --type-aware --format json` → `_meta.type_aware.abstained_count` / `abstention_reasons`.

Audit is type-aware too (`audit.typeAware: true`), so the changed-code gate uses the same semantic evidence as the full-repo baselines.

## 5. Architecture boundaries

```jsonc
"boundaries": {
  "zones": [
    { "name": "convex-api", "patterns": ["convex/_generated/**"] },
    { "name": "backend",    "patterns": ["convex/**"] },
    { "name": "app",        "patterns": ["src/app/**"] },
    { "name": "components", "patterns": ["src/components/**"] },
    { "name": "lib",        "patterns": ["src/lib/**"] },
    { "name": "i18n",       "patterns": ["src/i18n/**"] }
  ],
  "rules": [
    { "from": "backend",    "allow": ["convex-api"] },
    { "from": "app",        "allow": ["components", "lib", "i18n", "convex-api"] },
    { "from": "components", "allow": ["lib", "i18n", "convex-api"] },
    { "from": "lib",        "allow": ["i18n", "convex-api"] },
    { "from": "i18n",       "allow": [] }
  ],
  "coverage": { "requireAllFiles": true, "allowUnmatched": ["global.d.ts", "next.config.ts", "oxlint.config.ts", "vitest.config.ts", "vitest.setup.ts"] }
}
```

The model: `convex/_generated/**` is the backend's public API (unrestricted — both sides import it); `backend` may only reach its own generated API; `i18n` is fully isolated; everything else flows `app → components → lib → i18n/convex-api`. `requireAllFiles: true` fails CI when a new source file falls outside every zone (the listed tooling entrypoints are intentional exceptions). Boundary violations are error-severity; current count: 0. Inspect with `pnpm exec fallow list --boundaries`.

## 6. Baseline layers

**Exact baselines** (`fallow-baselines/*.json`) — identity-matched:

| File             | Analysis                                          | Matching mode                                      |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- |
| `dead-code.json` | Unused code, deps, private type leaks, boundaries | Per finding identity                               |
| `dupes.json`     | Clone groups (semantic + near-miss)               | Per clone fingerprint                              |
| `health.json`    | Complexity, CRAP, unit size                       | Per function identity (`--baseline-mode identity`) |

**Regression baseline** — issue **counts** embedded in `.fallowrc.json` (`regression.baseline`), written by `fallow dead-code --type-aware --save-regression-baseline`. Current: 86 total issues (48 unused files, 2 unused types, 36 private type leaks).

The dead-code baseline's `analysis_identity` (mode, capabilities, completeness) is checked against the enforcing run — baselines must be regenerated with the same semantic mode they are enforced with (`--type-aware`), which the baseline scripts do.

## 7. Local commands

```bash
pnpm fallow                # combined analysis (human output)
pnpm fallow:config         # resolved config (validates shapes; run before upgrades)
pnpm fallow:recommend      # project-tailored config suggestions (read-only)
pnpm fallow:status         # type-aware companion status
pnpm fallow:dead-code      # Gate A: dead-code exact baseline
pnpm fallow:dupes          # Gate A: duplication exact baseline
pnpm fallow:health         # Gate A: health identity baseline
pnpm fallow:audit          # changed-code gate (type-aware, new-only; passes coverage explicitly so the base-snapshot run uses the same CRAP evidence) — the pre-commit gate
pnpm fallow:regression     # Gate B: regression counts + completeness watch
pnpm fallow:security       # advisory security candidates (always exit 0; candidates are informational)
pnpm fallow:suppressions   # inventory of active fallow-ignore markers
pnpm fallow:ci             # authoritative full ratchet (version + freshness + A + B)
pnpm fallow:baseline:update  # regenerate every committed baseline (after genuine fixes)
pnpm fallow:baseline:check   # fail if committed baselines are stale (never mutates the tree)
pnpm fallow:fix:preview    # dry-run of safe auto-fixes
pnpm fallow:fix            # apply safe auto-fixes (never in CI)
```

`pnpm fallow:ci` is the local equivalent of the CI gate. Exit codes: 0 = pass, 1 = gate failure (findings beyond baseline / regression / stale baselines), 2 = tool or configuration error. Never use `|| true` around fallow without preserving exit code 2 semantics.

## 8. CI behavior

`.github/workflows/ci-reusable.yml` runs on every PR and push to master:

1. `pnpm check` (oxlint + oxfmt)
2. `pnpm next:typegen` (tsc)
3. `pnpm test:coverage` (writes `coverage/coverage-final.json`)
4. `pnpm fallow:ci` — version pin → type-aware status → coverage precondition → Gate D freshness → Gate A exact baselines → Gate B regression + completeness

`.github/workflows/ci-pull-request.yml` adds a second job using the official `fallow-rs/fallow@v3` action: `command: audit`, `gate: new-only`, `type-aware: auto`, with inline annotations, a sticky PR summary comment, a check run, and SARIF upload to Code Scanning (skipped with a warning on private repos without Advanced Security), with coverage and coverage-root passed explicitly for base-snapshot parity. Version alignment: the action's `version` input is omitted, so it resolves the `package.json` fallow pin — the CI binary and local binary are the same release. Each job has a distinct purpose: the action is the changed-code PR gate; `fallow:ci` is the full-repo ratchet.

## 9. Git-hook behavior (`hk.pkl`)

- **pre-commit**: oxfmt + oxlint + `pnpm fallow:audit` — fast changed-code gate rejecting newly introduced findings
- **pre-push**: `pnpm fallow:ci` — the full ratchet, where its runtime is acceptable
- **check / fix**: the fast steps (oxfmt, oxlint, fallow-audit)

## 10. Agent / MCP integration

- The version-matched skill is vendored at `.agents/skills/fallow/` (copied from `node_modules/fallow/skills/fallow` with a repo-notes section). Prefer it over stale reference docs; re-vendor on fallow upgrades.
- The `fallow` MCP server is registered in `.opencode/opencode.json` (`pnpm exec fallow-mcp`) for structured tool access (trace, symbol-impact, duplication trace, health, audit, fix preview).
- `AGENTS.md` points agents at the ratchet model; agents should use `pnpm fallow:audit` before committing and `--trace`/`--symbol-impact` before deleting anything fallow flags.

## 11. Coverage behavior

`health.coverage: "coverage/coverage-final.json"` in `.fallowrc.json` feeds real Istanbul coverage into CRAP scores (model: `istanbul`, vs the static-estimate fallback). `vitest.config.ts` emits both `text` and `json` reporters; `pnpm test:coverage` produces the coverage file. The baseline scripts and `fallow:ci` ensure coverage exists first (running tests if missing) so a coverage-less regeneration can never silently flip the health baseline to the static model. Note: per-statement execution counts from the Convex edge-runtime tests vary slightly between runs, but this does not shift any CRAP finding across the threshold — the health identity baseline is deterministic (verified by repeated regeneration). `coverageRoot` is not configured: coverage paths are absolute but rooted under the project checkout, which fallow strips automatically in CI.

## 12. Intentional exclusions (and why they are needed)

| Exclusion                                                              | Reason                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignorePatterns: scripts/**`                                           | Standalone data-import tooling outside the app graph (their imports would otherwise be invisible)                                                                   |
| `ignorePatterns: oxfmt.config.ts`                                      | Tooling config, not app code (oxlint/vitest/next configs are handled natively by fallow plugins — verified by removal test)                                         |
| `ignoreExports: src/components/ui/*.tsx`                               | shadcn components re-export their full component API; without this, 37 unused exports are reported (the directory is a local component library by convention)       |
| `ignoreDependencies: youtube-sr, yt-search, scrape-yt, scrape-youtube` | Used only by `scripts/fetch-youtube-ids.ts`, which is outside the app graph                                                                                         |
| `ignoreDependencies: @edge-runtime/vm`                                 | Vitest `edge-runtime` environment provider, resolved by vitest rather than imported                                                                                 |
| `ignoreDependencies: tailwindcss`                                      | Build-time `@import "tailwindcss"` directive in `globals.css`, compiled away by PostCSS — not a runtime import (otherwise reported as dev-dependency-in-production) |
| `boundaries.coverage.allowUnmatched`                                   | Tooling entrypoints (`next.config.ts`, `oxlint.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `global.d.ts`) have no architectural zone                         |

No `fallow-ignore-*` comments exist in the source. Everything else that was previously excluded (`.next/**`, `convex/_generated/**` findings, `messages/**` unresolved imports, `src/i18n/routing.ts:usePathname`, ten dependency entries) was removed after proving current fallow handles it natively.

## 13. Investigating a finding

```bash
# Why is this export flagged?
pnpm exec fallow dead-code --type-aware --trace src/lib/timeline.ts:getRevealedTrackMap

# Exact TypeScript consumers (type-aware)
pnpm exec fallow dead-code --type-aware --symbol-impact src/lib/hooks/use-presence.ts:usePresence

# Where is this dependency used?
pnpm exec fallow dead-code --trace-dependency sonner

# Duplication fingerprint deep-dive (findings carry `fingerprint`)
pnpm exec fallow dupes --trace dup:c77b3abb6f87acd9-2

# Health hotspots / refactoring targets / ownership
pnpm exec fallow health --hotspots --targets --ownership

# Which boundary rules apply to a file you are about to edit?
pnpm exec fallow guard src/components/game/betting-panel.tsx

# Explain an issue type without running analysis
pnpm exec fallow explain private-type-leak

# Suppression inventory
pnpm fallow:suppressions
```

## 14. Updating baselines after improvements

When you legitimately remove findings (or change config), regenerate **all** committed baselines coherently:

```bash
pnpm test:coverage          # required for the health baseline's CRAP evidence
pnpm fallow:baseline:update # writes fallow-baselines/*.json + .fallowrc.json regression counts
pnpm fallow:baseline:check  # proves the committed baselines are now fresh
git add .fallowrc.json fallow-baselines/
```

Baseline updates are appropriate **only** after genuine fixes or intentional config changes — never to silence a gate. CI enforces freshness (Gate D), so an improvement without a baseline update fails CI with a clear message.

## 15. Known upstream limitations

1. **`audit` + baseline files + type-aware are incompatible in fallow 3.16.0.** The audit's internal check run always requests the `type-coupling` semantic capability (its dead-code analysis shares a parse with health — `retain_modules_for_health` in `crates/cli/src/audit.rs`), while `fallow dead-code --save-baseline` can never produce a baseline whose identity includes that capability (no CLI surface for it). Baseline identity comparison requires exact capability equality (`incompatible_fields` in `crates/types/src/semantic.rs`) and hard-errors (exit 2) with no fallback (`load_and_compare_baseline` in `crates/cli/src/check/mod.rs`). **Consequence:** the audit config deliberately carries **no** baseline files; the changed-code gate relies on audit's own base-snapshot attribution (`--gate new-only`), which has the documented fallback to syntactic key sets when base/HEAD semantic identities differ (`type_aware_attribution_degrade_reason`). The exact baselines are enforced on the standalone analyses in `fallow:ci`. Revisit on every fallow upgrade — this may be fixed upstream.
2. **Audit base-snapshot runs only receive coverage via CLI flags.** The audit's temp-worktree base snapshot has no `coverage/` directory (it is gitignored), so config-relative `health.coverage` resolves to nothing there and `FALLOW_COVERAGE` is not honored on that path — only `--coverage`/`--coverage-root` flow into `build_base_audit_options`. Without them, the base run uses static CRAP estimation, boundary functions (e.g. a function at exactly `maxCrap: 30`) flip across the threshold, and inherited complexity findings are wrongly attributed as introduced. That is why `fallow:audit` and the CI action job pass both flags explicitly.
