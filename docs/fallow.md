# Fallow zero-debt gate

ChronoTunes enforces the canonical Fallow 3.17.0 ZERO-DEBT architecture. Every gate — pre-commit, pre-push, pull-request CI, and master pushes — fails on any finding; there is no baseline, attribution, or freshness machinery. The migration from the adoption-era `new-only` gate was tracked in [#313](https://github.com/samaluk/chronotunes/issues/313), with the target architecture based on [samaluk/fintual-api#405](https://github.com/samaluk/fintual-api/pull/405).

## Version and execution model

- The `fallow` dev dependency, type-aware companion, and MCP server are pinned to `3.17.0`.
- pnpm's strict one-day minimum release-age policy remains enabled; it has exact `3.17.0` exceptions only for Fallow and the eight Fallow platform packages plus the type-aware companion required by the lockfile.
- The pull-request action uses `fallow-rs/fallow@ecf5a314fd3e10974acb4f5a7f867c433030522d` (`v3.17.0`).
- Local and CI commands run through pnpm, so the repository lockfile controls the executable version.
- The repo-local MCP entry in `.opencode/opencode.json` runs `pnpm exec fallow-mcp`.
- The vendored `.agents/skills/fallow` directory is the skill shipped with Fallow 3.17.0.

## Gate semantics

`.fallowrc.json` sets:

```json
{
  "typeAware": { "enabled": true, "require": "complete" },
  "audit": { "gate": "all", "typeAware": true }
}
```

`gate: all` is the config default: bare `fallow audit`, the staged-diff pre-commit gate, and CI all fail on every finding — new or inherited. There is nothing left to attribute.

There are no committed Fallow baselines, regression snapshots, freshness checks, custom JSON parsers, SARIF uploads, or duplicate analysis wrappers. The one scheduled re-scan is the drift workflow described under [CI and hooks](#ci-and-hooks); it exists to catch tool-version regressions, not to track debt.

## Commands

```bash
# Canonical gate surface
pnpm fallow              # Bare CLI passthrough
pnpm fallow:staged       # Pre-commit: audit scoped to the staged diff (gate all)
pnpm fallow:full         # Zero-debt full scan: dead-code + dupes + health, all failing on issues
pnpm fallow:ci           # Alias of fallow:full used by CI

# Inspection utilities
pnpm fallow:config       # Show the resolved repository configuration
pnpm fallow:recommend    # Review configuration recommendations
pnpm fallow:status       # Verify the type-aware companion and protocol
pnpm fallow:security     # Unverified security candidates for human review
pnpm fallow:suppressions # Suppression and stale-suppression inventory
```

`fallow:full` composes the three zero-debt probes from the exit criteria in issue #313; each fails on any finding. The duplication probe enforces the configured percentage ceiling (`duplicates.threshold`), so the current boilerplate stock passes while any net increase fails.

`fallow:ci` consumes fresh Istanbul coverage produced by `pnpm test:coverage` in the same step chain — keep that ordering wherever these run.

## Type-aware analysis and dynamic surfaces

Type-aware analysis is currently complete for:

- `tsconfig.json` (application sources)
- `tsconfig.tests.json` (Vitest and test helpers)
- `convex/tsconfig.json` (Convex backend)

The static locale catalog in `src/i18n/messages.ts` replaces a template-literal JSON import. This makes both locale catalogs visible to the graph and keeps the type-aware companion at `complete` without a dynamic-import escape hatch.

`includeEntryExports` is intentionally left at its default. Next.js route files, Convex functions, generated bindings, and tool configuration are consumed by their frameworks or external tools rather than by ordinary TypeScript imports. Enabling entry-export checks currently creates unknown-symbol noise for those externally consumed surfaces. Re-enable it only when the framework entry contracts can be modeled without false positives; this decision is a zero-debt follow-up, not a suppression.

## Analysis configuration

The configuration enables:

- `private-type-leaks`, stale suppressions, and missing suppression reasons as errors.
- Semantic duplication plus near-duplicate detection with `minLines: 8`, `minTokens: 60`, `minOccurrences: 2`, and import wiring ignored. A `threshold` of 11 % makes `dupes --fail-on-issues` a real gate: the current stock (shadcn-style boilerplate and CSS utility patterns) is the ceiling, and any net increase fails CI.
- Health thresholds of cyclomatic 20, cognitive 15, CRAP 30, and unit size 60.
- Istanbul coverage from `coverage/coverage-final.json` for CRAP and coverage-gap analysis.
- Five explicit zones: Convex backend, app routes, components, shared library, and i18n. The generated Convex API is excluded from analysis entirely (see below), so it is no longer a zone. The rules prevent i18n from importing application code and keep backend/framework direction explicit. Boundary inspection reports zero violations.
- Boundary coverage for every matched file. Only the named tool/config files are allowed to remain unmatched because they are not runtime modules.

The remaining exclusions are narrow and intentional:

- `scripts/**` and `oxfmt.config.ts` are tooling surfaces, not application entry points.
- `convex/_generated/**` is machine-written by `convex codegen` and regenerated wholesale; inline annotations there would not survive regeneration, so the generated bindings are excluded from analysis entirely.
- `src/components/ui/*.tsx` exports are the generated-style shadcn component surface and are consumed by convention.
- `scrape-yt` and `scrape-youtube` are script-only entrypoint dependencies; `@edge-runtime/vm` is a provider/runtime dependency; `tailwindcss` is consumed by the build pipeline.

## Current state and dispositions

Full-repository probes on the stack tip (Fallow 3.17.0, 302 tests):

- Dead code: **0 findings** (`dead-code --type-aware --fail-on-issues` exits 0). The adoption-era backlog — 48 unused files, 1 unused export, 2 unused types, 37 private-type leaks, 3 unused dependencies — is fully retired.
- Duplication: **8.8 % duplicated lines** (1,012 lines, 15 files), under the configured 11 % ceiling; `dupes --mode semantic --near --fail-on-issues` exits 0.
- Health: score **75/100 (grade B)**, `health --type-aware --coverage … --fail-on-issues` exits 0 with no function above thresholds.
- Boundaries: five zones, zero violations.
- Suppressions: zero suppressions, zero stale suppressions.
- Vitest: 37 files, 302 tests; Istanbul matches 616 of 1,430 functions.

Dispositions for the advisory surfaces named in #313's exit criterion 5:

- Security candidates: the two open-redirect candidates in `src/app/landing-page-content.tsx` were **resolved** — post-create/join navigation validates the server/lobby code against the lobby-code shape and navigates via `router.push` instead of assigning `window.location.href`. `fallow security` now reports zero items.
- Coverage gaps: the CRAP gate forces coverage wherever untested complexity breaches the health thresholds (the game hot paths decomposed in this stack all carry render suites); remaining uncovered files are UI shells, generated bindings, and config entry points where behavior is pinned by type-aware analysis. Coverage-gap findings stay `off` in rules because the CRAP gate is the enforcement surface.
- Duplication ceiling vs zero: the 11 % threshold is a deliberate ratchet, not full elimination. The residual stock is shadcn-style boilerplate and CSS utility patterns whose extraction would hurt readability; any net increase fails CI.
- Drift workflow: a version-keyed cache re-scan when the pinned fallow version changes. This is intentional freshness machinery — the only scheduled scan in the repo — and it exists to catch tool regressions, not to carry debt.

## CI and hooks

Pull-request and master-push runs use the dedicated `.github/workflows/fallow.yml`: `test:coverage` followed by `fallow:ci` (≡ `fallow:full`), every finding blocking, SHA-pinned actions, least-privilege permissions, cancel-in-progress concurrency. It replaces both the adoption-era native-action PR job and the reusable-CI Fallow step. `.github/workflows/fallow-drift.yml` re-scans on dependency-file pushes when the lockfile-installed fallow version was not seen before.

The hk configuration runs:

- pre-commit: Oxfmt, Oxlint, and the staged-diff `pnpm fallow:staged` gate (gate all — every finding on a staged line blocks);
- pre-push: normal checks, Next type generation, coverage tests, and the full zero-debt `pnpm fallow:full` scan.

## Zero-debt status

All exit criteria from #313 are green and enforced:

```bash
pnpm exec fallow dead-code --type-aware --fail-on-issues   # exit 0
pnpm exec fallow dupes --mode semantic --near --fail-on-issues  # exit 0 (threshold 11 %)
pnpm exec fallow health --type-aware \
  --coverage coverage/coverage-final.json --coverage-root "$PWD" --fail-on-issues   # exit 0
```

Representative failure probes (exit criterion 6), run before flipping hooks/CI to strict gates:

| Probe                                                                    | Injected finding             | Result                          |
| ------------------------------------------------------------------------ | ---------------------------- | ------------------------------- |
| `fallow dead-code --type-aware --fail-on-issues`                         | one unused exported function | exit 1                          |
| `git diff --cached \| fallow audit --diff-stdin --gate all --type-aware` | same finding, staged         | exit 1 (`✗ dead code: 1 issue`) |

During the migration, the standalone probes were also observed failing on the real inherited debt as each category was driven to zero (dead-code 91 → 0, health hotspots 42 → 0, duplication 102 → below-threshold clone groups); per-PR evidence is in the #342–#348 PR descriptions.

`pnpm fallow:full` chains the three strict analyses; `pnpm fallow:ci` is its CI alias. The hk pre-commit runs the staged-diff audit (`fallow:staged`, gate all), pre-push runs the full scan, and the dedicated Fallow workflow runs it on every PR and master push. The drift workflow re-scans whenever the pinned fallow version changes.
