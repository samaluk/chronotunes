# Fallow adoption gate

ChronoTunes uses the canonical Fallow 3.17.0 ADOPTION architecture. The repository is protected from newly introduced findings while the inherited backlog remains visible and non-blocking. This is intentionally not a zero-debt gate yet.

The zero-debt work is tracked in [#313](https://github.com/samaluk/chronotunes/issues/313), with the target architecture based on [samaluk/fintual-api#405](https://github.com/samaluk/fintual-api/pull/405).

## Version and execution model

- The `fallow` dev dependency, type-aware companion, and MCP server are pinned to `3.17.0`.
- pnpm's strict one-day minimum release-age policy remains enabled; it has exact `3.17.0` exceptions only for Fallow and the eight Fallow platform packages plus the type-aware companion required by the lockfile.
- The pull-request action uses `fallow-rs/fallow@ecf5a314fd3e10974acb4f5a7f867c433030522d` (`v3.17.0`).
- Local and CI commands run through pnpm, so the repository lockfile controls the executable version.
- The repo-local MCP entry in `.opencode/opencode.json` runs `pnpm exec fallow-mcp`.
- The vendored `.agents/skills/fallow` directory is the skill shipped with Fallow 3.17.0.

## Adoption semantics

`.fallowrc.json` sets:

```json
{
  "typeAware": { "enabled": true, "require": "complete" },
  "audit": { "gate": "new-only", "typeAware": true }
}
```

`new-only` compares the pull request with its merge-base. Findings already present in the base remain in the report, but do not fail the gate. A changed file that introduces a new unused export, boundary violation, clone, or other supported finding does fail the gate.

There are no committed Fallow baselines, regression snapshots, freshness checks, custom JSON parsers, SARIF uploads, or duplicate analysis wrappers. When the backlog is clean, the follow-up in #313 will switch the standalone analyses and `audit` to strict zero-debt behavior.

## Commands

```bash
pnpm fallow:config       # Show the resolved repository configuration
pnpm fallow:recommend    # Review configuration recommendations
pnpm fallow:status       # Verify the type-aware companion and protocol

pnpm fallow:audit        # Fast changed-code new-only gate (pre-commit)
pnpm fallow:ci           # Coverage-aware changed-code new-only gate (pre-push/CI)

pnpm fallow:dead-code    # Full-repository dead-code inspection (advisory today)
pnpm fallow:dupes        # Semantic + near-duplicate inspection (advisory today)
pnpm fallow:health       # Complexity, CRAP, maintainability, and coverage-aware health
pnpm fallow:security     # Unverified security candidates for human review
pnpm fallow:suppressions # Suppression and stale-suppression inventory
```

The full-repository commands intentionally do not use `--fail-on-issues` during adoption. Exit code 1 means findings were found and is expected while inherited debt is being retired; exit code 2 means the command itself failed. Use `--format json --quiet --explain` when scripting or investigating a finding.

`fallow:ci` is the migration gate used by CI and the pre-push hook. It runs after `pnpm test:coverage`, consumes `coverage/coverage-final.json`, and checks only changed findings. `fallow:audit` omits coverage so pre-commit stays fast.

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
- Semantic duplication plus near-duplicate detection with `minLines: 8`, `minTokens: 60`, `minOccurrences: 2`, and import wiring ignored.
- Health thresholds of cyclomatic 20, cognitive 15, CRAP 30, and unit size 60.
- Istanbul coverage from `coverage/coverage-final.json` for CRAP and coverage-gap analysis.
- Six explicit zones: generated Convex API, Convex backend, app routes, components, shared library, and i18n. The rules prevent i18n from importing application code and keep backend/framework direction explicit. Boundary inspection currently reports zero violations.
- Boundary coverage for every matched file. Only the named tool/config files are allowed to remain unmatched because they are not runtime modules.

The remaining exclusions are narrow and intentional:

- `scripts/**` and `oxfmt.config.ts` are tooling surfaces, not application entry points.
- `src/components/ui/*.tsx` exports are the generated-style shadcn component surface and are consumed by convention.
- `scrape-yt` and `scrape-youtube` are script-only entrypoint dependencies; `@edge-runtime/vm` is a provider/runtime dependency; `tailwindcss` is consumed by the build pipeline.

## Current inherited debt

The latest full-repository inspections are advisory and are recorded in #313:

- Dead code: 91 findings — 48 unused files, 1 unused export, 2 unused types, 37 private-type leaks, and 3 unused dependencies (`@uidotdev/usehooks`, `youtube-sr`, `yt-search`).
- Duplication: 102 semantic/near clone groups, 263 instances, and 25.15% duplicated lines.
- Health: 1,412 functions analyzed, 63 above configured thresholds, with a current score around 63/100 (grade C) when Istanbul coverage is loaded.
- Latest Vitest coverage: 20 files and 224 tests passed; 64.64% statements, 55.50% branches, 58.46% functions, and 65.02% lines.
- Coverage gaps: Istanbul matched 389 of 1,412 functions; 46 of 100 runtime files are covered, leaving 54 files and 145 exports without runtime coverage evidence.
- Boundaries: six zones, zero current violations.
- Suppressions: zero current suppressions and zero stale suppressions.
- Security: two unverified medium open-redirect candidates in `src/app/landing-page-content.tsx`; Fallow reports candidates for review and does not establish exploitability.

These numbers are triage inputs, not a reason to weaken the adoption gate or add broad ignores.

## CI and hooks

The pull-request workflow has one native `fallow-rs/fallow` analysis. It uses `command: audit`, `gate: new-only`, `type-aware: true`, the Istanbul report, semantic and near-duplicate inputs, and the native sticky compact comment, Check Run, inline comments, and review guidance. It does not upload SARIF and does not grant `security-events` or identity-token permissions.

The hk configuration runs:

- pre-commit: Oxfmt, Oxlint, and the fast `pnpm fallow:audit` gate;
- pre-push: normal checks, Next type generation, coverage tests, and `pnpm fallow:ci`.

## Zero-debt exit criteria

The adoption gate can become strict only after #313 has addressed the inherited findings and these commands are clean:

```bash
pnpm exec fallow dead-code --type-aware --fail-on-issues
pnpm exec fallow dupes --mode semantic --near --fail-on-issues
pnpm exec fallow health --type-aware \
  --coverage coverage/coverage-final.json --coverage-root "$PWD" --fail-on-issues
```

Before changing the gate, verify complete type-aware semantics, cover the runtime gaps that matter, resolve boundary and security candidates, and run representative probes showing that each strict standalone analysis and `fallow audit --gate all` fails on a real new finding. Then CI and hk can move from adoption (`new-only`) to strict zero-debt enforcement.
