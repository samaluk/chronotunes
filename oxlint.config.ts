import { defineConfig } from "oxlint";

// Oxlint defaults (correctness category; typescript/unicorn/oxc plugins on) plus
// type-aware linting via oxlint-tsgolint and strict TypeScript escape-hatch rules.
export default defineConfig({
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
  },
});
