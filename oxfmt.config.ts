import { defineConfig } from "oxfmt";

// Near-default Oxfmt, with an explicit print width and repo-local ignores.
// `fallow-*` covers transient review artifacts that may remain in local workspaces.
export default defineConfig({
  printWidth: 100,
  ignorePatterns: [".agents/**", ".fallowrc.json", "convex/_generated/**", "fallow-*"],
});
