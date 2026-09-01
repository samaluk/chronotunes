# Fallow zero-debt gate

ChronoTunes enforces the canonical Fallow 3.20.0 ZERO-DEBT architecture. Every gate — pre-commit, pre-push, and pull-request CI — fails on any finding; there is no baseline or attribution machinery. The migration from the adoption-era `new-only` gate was tracked in [#313](https://github.com/samaluk/chronotunes/issues/313), with the target architecture based on [samaluk/fintual-api#405](https://github.com/samaluk/fintual-api/pull/405). Generic validation is PR-first; default-branch workflows are reserved for genuinely post-merge behavior.

## Version and execution model

- The `fallow` dev dependency, type-aware companion, and MCP server are pinned to `3.20.0`.
- pnpm's strict one-day minimum release-age policy remains enabled; it has exact `3.20.0` exceptions only for Fallow and the eight Fallow platform packages plus the type-aware companion required by the lockfile.
- The reusable CI workflow keeps the lockfile-controlled CLI gate authoritative and uploads one fresh coverage report. During the staged required-check migration, the legacy dedicated Fallow workflow still provides the required `Fallow` status; afterward, optional `ci / Fallow feedback` will consume that artifact on `ubuntu-latest` for the official Action's pull-request summary, Check Run, and inline review feedback.
- The repo-local MCP entry in `.opencode/opencode.json` runs `pnpm exec fallow-mcp`.
- The vendored `.agents/skills/fallow` directory is the skill shipped with Fallow 3.20.0.

## Gate semantics

`.fallowrc.json` sets:

```json
{
  "typeAware": { "enabled": true, "require": "complete" },
  "audit": { "gate": "all", "typeAware": true }
}
```

`gate: all` is the config default: bare `fallow audit`, the staged-diff pre-commit gate, and CI all fail on every finding — new or inherited. There is nothing left to attribute.

There are no committed Fallow baselines, regression snapshots, freshness checks, custom JSON parsers, SARIF uploads, or duplicate analysis wrappers.

## Commands

```bash
# Canonical gate surface
pnpm fallow              # Bare CLI passthrough
pnpm fallow:staged       # Pre-commit: audit scoped to the staged diff (gate all)
pnpm fallow:audit        # Covered changed-code audit (gate all)
pnpm fallow:full         # Audit + dead-code + dupes + health, all blocking
pnpm fallow:ci           # Alias of fallow:full used by CI

# Standalone blocking analyzers
pnpm fallow:dead-code    # Full-repository dead-code probe
pnpm fallow:dupes        # Semantic + near-duplicate probe
pnpm fallow:health       # Coverage-aware complexity and CRAP probe

# Inspection utilities
pnpm fallow:config       # Show the resolved repository configuration
pnpm fallow:recommend    # Review configuration recommendations
pnpm fallow:status       # Verify the type-aware companion and protocol
pnpm fallow:security     # Unverified security candidates for human review
pnpm fallow:suppressions # Suppression and stale-suppression inventory
```

`fallow:full` starts with the covered changed-code audit and then runs the three project-wide analyzers. The audit uses `gate: all`, so every finding in changed files blocks; each standalone analyzer also exits nonzero for its own findings. Duplication has no measurable percentage headroom: the standalone command uses the smallest positive threshold supported by the pinned CLI so every semantic or near clone must be refactored or represented by a reviewed fingerprint and occurrence count in `duplicates.ignoredClones`.

`fallow:ci` consumes fresh Istanbul coverage produced by `pnpm test:coverage` in the same step chain for both audit and health — keep that ordering wherever these run.

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
- Semantic duplication plus near-duplicate detection with `minLines: 8`, `minTokens: 60`, `minOccurrences: 2`, import wiring ignored, and no percentage threshold. The reviewed `ignoredClones` list is keyed by fingerprint and current occurrence count, so content or count changes report again.
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

Full-repository probes on the stack tip (Fallow 3.20.0, 302 tests):

- Dead code: **0 findings** (`dead-code --type-aware --fail-on-issues` exits 0). The adoption-era backlog — 48 unused files, 1 unused export, 2 unused types, 37 private-type leaks, 3 unused dependencies — is fully retired.
- Duplication: **0 unreviewed clone groups**; `dupes --mode semantic --near --threshold 5e-324 --fail-on-issues` exits 0 with only individually reviewed fingerprint/count exceptions.
- Health: score **79/100 (grade B)**, `health --type-aware --coverage … --fail-on-issues` exits 0 with no function above thresholds.
- Boundaries: five zones, zero violations.
- Suppressions: zero suppressions, zero stale suppressions.
- Vitest: 37 files, 302 tests; Istanbul matches 617 of 1,434 functions.

Dispositions for the advisory surfaces named in #313's exit criterion 5:

- Security candidates: the two open-redirect candidates in `src/app/landing-page-content.tsx` were **resolved** — post-create/join navigation validates the server/lobby code against the lobby-code shape and navigates via `router.push` instead of assigning `window.location.href`. `fallow security` now reports zero items.
- Coverage gaps: the CRAP gate forces coverage wherever untested complexity breaches the health thresholds (the game hot paths decomposed in this stack all carry render suites); remaining uncovered files are UI shells, generated bindings, and config entry points where behavior is pinned by type-aware analysis. Coverage-gap findings stay `off` in rules because the CRAP gate is the enforcement surface.
- Duplication dispositions: pair-level semantic+near detection found 28 groups. One genuine repeated range-normalization block was refactored; the remaining 27 stable groups are individually fingerprinted below because extraction would reduce clarity or discard intentional fixture/design-token structure. A changed clone body or occurrence count is intentionally unreviewed and blocks until reclassified.

### Reviewed clone groups

The list below is the complete pair-level result from Fallow 3.20.0 with semantic and near detection enabled. The count suffix is part of each reviewed key; adding an instance or changing the normalized content creates a new finding.

| Fingerprint               | Count | Review reason                                                               |
| ------------------------- | ----: | --------------------------------------------------------------------------- |
| `dup:c77b3abb6f87acd9-14` |     7 | Seed track records intentionally repeat one stable fixture shape.           |
| `dup:c77b3abb6f87acd9-16` |     2 | Seed track records intentionally repeat one stable fixture shape.           |
| `dup:80dd416f`            |     4 | Light and dark theme tokens intentionally share CSS declaration structure.  |
| `dup:bd1723a3`            |     5 | Light and dark theme tokens intentionally share CSS declaration structure.  |
| `dup:e03487a3`            |     2 | Light and dark theme tokens intentionally share CSS declaration structure.  |
| `dup:c77b3abb6f87acd9-8`  |     2 | Typed test factories intentionally mirror collection result adapters.       |
| `dup:c75cbecd`            |     2 | Typed test factories intentionally mirror collection result adapters.       |
| `dup:496d9440`            |     2 | Typed test factories intentionally mirror single-record query adapters.     |
| `dup:c77b3abb6f87acd9-11` |     3 | Typed test factories intentionally mirror single-record lookup adapters.    |
| `dup:c77b3abb6f87acd9-2`  |     2 | Typed test factories intentionally mirror single-record lookup adapters.    |
| `dup:c77b3abb6f87acd9-3`  |     2 | Typed test factories intentionally mirror lobby setup and lookup data.      |
| `dup:4b86aae9`            |     2 | Typed test factories intentionally mirror single-record lookup adapters.    |
| `dup:c77b3abb6f87acd9-15` |     2 | Typed test factories intentionally mirror single-record query adapters.     |
| `dup:9ced35c1`            |     2 | Typed test factories intentionally mirror single-record query adapters.     |
| `dup:c77b3abb6f87acd9-18` |     2 | Typed test factories intentionally mirror single-record query adapters.     |
| `dup:68751c8d`            |     3 | Skeleton components intentionally repeat loading-state composition.         |
| `dup:00e1ba20`            |     2 | Skeleton components intentionally repeat loading-state composition.         |
| `dup:c77b3abb6f87acd9-7`  |     2 | Skeleton components intentionally repeat loading-state composition.         |
| `dup:c77b3abb6f87acd9-6`  |     2 | Generated-style card primitives intentionally repeat slot wrappers.         |
| `dup:c77b3abb6f87acd9-4`  |     2 | Generated-style card primitives intentionally repeat slot wrappers.         |
| `dup:c77b3abb6f87acd9-13` |     2 | Generated-style UI primitives intentionally repeat forwarding wrappers.     |
| `dup:c77b3abb6f87acd9-10` |     2 | Generated-style UI primitives intentionally repeat forwarding wrappers.     |
| `dup:c77b3abb6f87acd9-5`  |     2 | Betting mutations intentionally repeat distinct validated database writes.  |
| `dup:c77b3abb6f87acd9-1`  |     3 | Betting and round mutations intentionally repeat distinct lifecycle checks. |
| `dup:c77b3abb6f87acd9-9`  |     2 | Round mutations intentionally repeat distinct phase validations.            |
| `dup:c77b3abb6f87acd9-17` |     2 | Round and bet handlers intentionally combine distinct game reads.           |
| `dup:c77b3abb6f87acd9-12` |     2 | Lobby and schema declarations intentionally mirror record fields.           |

## CI and hooks

Pull requests use the reusable `.github/workflows/ci-reusable.yml`: `test:coverage`, one coverage artifact upload, the preserved Frog validation, and `fallow:ci` (≡ `fallow:full`) in the authoritative `ci / ci` job. During the required-check transition, `.github/workflows/fallow.yml` remains PR-only so the legacy `Fallow` status continues to be emitted; it is removed only after the ruleset no longer requires it. The optional `ci / Fallow feedback` job runs the official SHA-pinned Action on `ubuntu-latest`, consuming the artifact without blocking merges.

The hk configuration runs:

- pre-commit: Oxfmt, Oxlint, and the staged-diff `pnpm fallow:staged` gate (gate all — every finding on a staged line blocks);
- pre-push: normal checks, Next type generation, coverage tests, and the full zero-debt `pnpm fallow:full` scan.

## Zero-debt status

All exit criteria from #313 are green and enforced:

```bash
pnpm fallow:audit   # exit 0 (audit --gate all with fresh coverage)
pnpm exec fallow dead-code --type-aware --fail-on-issues   # exit 0
pnpm exec fallow dupes --mode semantic --near --threshold 5e-324 --fail-on-issues  # exit 0 (0 unreviewed groups)
pnpm exec fallow health --type-aware \
  --coverage coverage/coverage-final.json --coverage-root "$PWD" --fail-on-issues   # exit 0
```

Representative failure probes (exit criterion 6), run before flipping hooks/CI to strict gates:

| Probe                       | Injected finding                    | Result |
| --------------------------- | ----------------------------------- | ------ |
| `pnpm fallow:audit`         | unused file/export                  | exit 1 |
| `pnpm fallow:dead-code`     | unused file/export                  | exit 1 |
| `pnpm fallow:audit`         | forbidden i18n → component import   | exit 1 |
| `pnpm fallow:dupes`         | new semantic clone                  | exit 1 |
| `pnpm fallow:health`        | uncovered cyclomatic/CRAP violation | exit 1 |
| covered type-aware commands | broken configured test project      | exit 1 |
| `pnpm fallow:full`          | each applicable finding above       | exit 1 |

During the migration, the standalone probes were also observed failing on the real inherited debt as each category was driven to zero (dead-code 91 → 0, health hotspots 42 → 0, duplication 102 → 0 unreviewed groups); per-PR evidence is in the #342–#348 PR descriptions.

`pnpm fallow:full` chains the strict changed-code audit, dead-code, duplication, and health analyses; `pnpm fallow:ci` is its CI alias. The hk pre-commit runs the staged-diff audit (`fallow:staged`, gate all), pre-push runs the covered full scan, and reusable CI runs it once per PR. The native PR feedback is audit-based with `gate: all`.
