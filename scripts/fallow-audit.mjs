#!/usr/bin/env node
/**
 * Changed-code Fallow audit (`pnpm fallow:audit`), type-aware with `--gate
 * new-only`.
 *
 * Passes coverage explicitly (absolute path + coverage-root) so the audit's
 * base-snapshot run in its temp worktree uses the same Istanbul evidence as
 * the head run. Without this, the base run falls back to static CRAP
 * estimation (the worktree has no coverage/ directory), boundary functions
 * flip across the threshold, and inherited complexity findings are wrongly
 * attributed as introduced.
 *
 * Exit semantics: 0 = pass, 1 = introduced findings, 2 = tool/config error.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COVERAGE_FILE = path.join(ROOT, "coverage", "coverage-final.json");

function run(command, args, env = process.env) {
  // oxlint-disable-next-line typescript/no-unsafe-argument
  const result = spawnSync(command, args, { stdio: "inherit", env });

  if (result.error) {
    console.error(`${command} failed to start: ${result.error.message}`);
    process.exit(2);
  }

  process.exit(result.status ?? 2);
}

if (!existsSync(COVERAGE_FILE)) {
  console.log("coverage/coverage-final.json missing; running `pnpm test:coverage` first.");
  run("pnpm", ["test:coverage"]);
}

const args = [
  "exec",
  "fallow",
  "audit",
  "--gate",
  "new-only",
  "--type-aware",
  "--coverage",
  COVERAGE_FILE,
  "--coverage-root",
  ROOT,
  ...process.argv.slice(2),
];

run("pnpm", args);
