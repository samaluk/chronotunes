import { defineConfig } from "oxlint";

// Oxlint defaults (correctness category; typescript/unicorn/oxc plugins on) plus
// type-aware linting via oxlint-tsgolint, strict TypeScript escape-hatch rules,
// and React Compiler-derived rules from the react plugin.
export default defineConfig({
  plugins: ["unicorn", "typescript", "oxc", "react"],
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
  },
});
