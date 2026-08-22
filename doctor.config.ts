import { defineConfig } from "react-doctor/api";

// Strict React Doctor policy.
//
// Every enabled rule runs at "error": any new finding (of any severity class
// the rule shipped with) fails hooks and CI outright. Category re-stamps only
// affect rules that are already enabled — opt-out families tagged
// `design` / `test-noise` stay off unless pinned explicitly below.
//
// The project-level graph checks (unused exports / unused dependencies /
// circular imports) are part of the built-in dead-code analysis rather than
// configurable lint rules; they already run on every full and staged scan.
export default defineConfig({
  $schema: "https://react.doctor/schema/config.json",
  categories: {
    Accessibility: "error",
    Bugs: "error",
    Maintainability: "error",
    Performance: "error",
    Security: "error",
  },
  // Keep the redundant-manual-memoization rule at error even though it ships
  // as a warning once the React Compiler is detected: this repo treats manual
  // memo() / useMemo / useCallback wrappers as regressions.
  buckets: {
    "compiler-cleanup": "error",
  },
});
