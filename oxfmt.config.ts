import { defineConfig } from "oxfmt";

// Near-default Oxfmt, with an explicit print width and repo-local ignores.
// `fallow-*` covers transient Fallow review artifacts that persist in shared
// self-hosted runner workspaces (checkout skips git clean there).
export default defineConfig({
  printWidth: 100,
  ignorePatterns: [".agents/**", ".fallowrc.json", "convex/_generated/**", "fallow-*"],
});
