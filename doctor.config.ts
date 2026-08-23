import { defineConfig } from "react-doctor/api";

// Strict React Doctor policy.
//
// Rule severities stay at their shipped defaults: gating is handled by
// `blocking: warning` (hooks and CI fail on any newly introduced warning or
// error), so no error-ceiling re-stamps are needed here.
//
// The project-level graph checks (unused exports / unused dependencies /
// circular imports) are part of the built-in dead-code analysis rather than
// configurable lint rules; they already run on every full and staged scan.
export default defineConfig({
  $schema: "https://react.doctor/schema/config.json",
});
