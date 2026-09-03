import { defineConfig } from "oxlint";

// Oxlint defaults (correctness category; typescript/unicorn/oxc plugins on) plus
// type-aware linting via oxlint-tsgolint, strict TypeScript escape-hatch rules,
// and React Compiler-derived rules from the react plugin.
export default defineConfig({
  plugins: ["unicorn", "typescript", "oxc", "react", "vitest"],
  options: {
    typeAware: true,
  },
  rules: {
    "typescript/ban-ts-comment": "error",
    "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    "typescript/no-explicit-any": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    // React Compiler correctness (recommended preset)
    "react/error-boundaries": "error",
    "react/globals": "error",
    "react/immutability": "error",
    "react/incompatible-library": "error",
    "react/preserve-manual-memoization": "error",
    "react/purity": "error",
    "react/refs": "error",
    "react/set-state-in-effect": "error",
    "react/set-state-in-render": "error",
    "react/static-components": "error",
    "react/use-memo": "error",
    "react/void-use-memo": "error",
    // React Compiler restriction
    "react/unsupported-syntax": "error",
    "react/invariant": "error",
    "react/rule-suppression": "error",
    "react/syntax": "error",
    "react/todo": "error",
    // React Compiler perf
    "react/no-deriving-state-in-effects": "error",
    // React Compiler suspicious
    "react/capitalized-calls": "error",
    "react/exhaustive-effect-dependencies": "error",
    "react/hooks": "error",
    "react/memo-dependencies": "error",
    // Vitest correctness & hygiene (0 existing violations)
    "vitest/no-conditional-tests": "error",
    "vitest/no-focused-tests": "error",
    "vitest/no-disabled-tests": "error",
    "vitest/no-standalone-expect": "error",
    "vitest/valid-describe-callback": "error",
    "vitest/valid-expect": ["error", { alwaysAwait: true }],
    "vitest/valid-expect-in-promise": "error",
    "vitest/no-identical-title": "error",
    "vitest/no-test-prefixes": "error",
    "vitest/no-test-return-statement": "error",
    "vitest/no-import-node-test": "error",
    "vitest/no-commented-out-tests": "error",
    "vitest/require-awaited-expect-poll": "error",
    "vitest/hoisted-apis-on-top": "error",
    "vitest/prefer-to-have-length": "error",
    "vitest/prefer-to-contain": "error",
    "vitest/prefer-to-be": "error",
    "vitest/prefer-comparison-matcher": "error",
    "vitest/prefer-called-once": "error",
    "vitest/prefer-strict-equal": "error",
    "vitest/prefer-strict-boolean-matchers": "error",
    "vitest/require-to-throw-message": "error",
    "vitest/no-conditional-expect": "error",
    "vitest/valid-title": "error",
    // Configurable Vitest rules aligned with project standards
    "vitest/consistent-vitest-vi": ["error", { fn: "vi" }],
    "vitest/consistent-test-filename": ["error", { pattern: ".*\\.test\\.[tj]sx?$" }],
    "vitest/max-nested-describe": ["error", { max: 2 }],
    "vitest/expect-expect": [
      "error",
      { assertFunctionNames: ["expect", "assert", "expectTypeOf", "assertType"] },
    ],
    "vitest/prefer-lowercase-title": ["error", { ignore: ["describe"] }],
    "vitest/prefer-import-in-mock": ["error", { fixable: false }],
    "vitest/consistent-each-for": "error",
    // Evaluated configurable Vitest rules deliberately disabled per docs/agents/testing.md
    // Rejects workflow testing ("fewer, longer tests") in favor of artificial 1-assertion fragmentation
    "vitest/max-expects": "off",
    // ChronoTunes prefers flat suites with top-level test(...) over mandatory describe blocks
    "vitest/require-top-level-describe": "off",
    // afterEach is necessary for cleanup; factory helpers preferred over beforeEach for setup
    "vitest/no-hooks": "off",
    // Mixed usage (test for top-level/Convex, it inside describe) currently permitted
    "vitest/consistent-test-it": "off",
    // Niche/specialized rules kept off
    "vitest/prefer-expect-assertions": "off",
    "vitest/no-large-snapshots": "off",
    "vitest/prefer-snapshot-hint": "off",
    "vitest/no-restricted-matchers": "off",
    "vitest/no-restricted-vi-methods": "off",
    "vitest/require-hook": "off",
    // Temporarily disabled while fixing offenders in subsequent commit
    "vitest/require-mock-type-parameters": "off",
  },
});
