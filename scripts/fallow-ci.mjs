#!/usr/bin/env node
/**
 * Authoritative Fallow CI gate (`pnpm fallow:ci`).
 *
 * Runs the full quality ratchet exactly as CI does:
 *   1. Version pin check (installed CLI must match the package.json pin)
 *   2. Type-aware companion status
 *   3. Coverage precondition (health CRAP uses coverage/coverage-final.json)
 *   4. Gate D: baseline freshness (scripts/fallow-baseline-check.mjs)
 *   5. Gate A: exact identity baselines (dead-code, dupes, health)
 *   6. Gate B: embedded regression counts + type-aware completeness watch
 *
 * Exit semantics: 0 = all gates pass; 1 = a gate failed (findings beyond a
 * baseline, stale baselines, regression, completeness regression); 2 = tool
 * or configuration error. Never use `|| true` around this script.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// oxlint-disable-next-line typescript/no-unsafe-assignment
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
// oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
const PINNED_FALLOW = packageJson.devDependencies?.fallow;

if (!PINNED_FALLOW) {
  console.error("package.json has no fallow devDependency pin; add one first.");
  process.exit(2);
}

function run(command, args, env = process.env, { allowIssueExit = false } = {}) {
  // oxlint-disable-next-line typescript/no-unsafe-argument
  const result = spawnSync(command, args, { stdio: "inherit", env });

  if (result.error) {
    console.error(`${command} failed to start: ${result.error.message}`);
    process.exit(2);
  }

  if (result.status === 0) {
    return;
  }

  if (allowIssueExit && result.status === 1) {
    return;
  }

  process.exit(result.status ?? 2);
}

function fallow(args, options) {
  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-assignment
  run("pnpm", ["exec", "fallow", ...args], process.env, options);
}

const version = spawnSync("pnpm", ["exec", "fallow", "--version"], {
  encoding: "utf-8",
  env: process.env,
});

if (version.status !== 0) {
  console.error("Failed to read Fallow version.");
  process.exit(version.status ?? 2);
}

const versionMatch = version.stdout.match(/fallow\s+(?<version>\S+)/u);
const installedVersion = versionMatch?.groups?.version;
if (installedVersion !== PINNED_FALLOW) {
  console.error(
    `Expected fallow ${PINNED_FALLOW} (package.json pin), found ${installedVersion ?? "unknown"}.`,
  );
  process.exit(2);
}

console.log(`==> Fallow ${installedVersion}`);
fallow(["type-aware", "status"]);

console.log("\n==> Coverage precondition");
if (!existsSync("coverage/coverage-final.json")) {
  console.log("coverage/coverage-final.json missing; running `pnpm test:coverage` first.");
  run("pnpm", ["test:coverage"]);
}
console.log("coverage present; health CRAP uses real coverage evidence.");

console.log("\n==> Gate D: baseline freshness");
run("node", ["scripts/fallow-baseline-check.mjs"]);

console.log("\n==> Gate A: exact baselines");
fallow(
  [
    "dead-code",
    "--type-aware",
    "--baseline",
    "fallow-baselines/dead-code.json",
    "--fail-on-issues",
    "--quiet",
  ],
  { allowIssueExit: false },
);
fallow(["dupes", "--baseline", "fallow-baselines/dupes.json", "--fail-on-issues", "--quiet"], {
  allowIssueExit: false,
});
fallow(
  [
    "health",
    "--baseline",
    "fallow-baselines/health.json",
    "--baseline-mode",
    "identity",
    "--fail-on-issues",
    "--quiet",
  ],
  { allowIssueExit: false },
);

console.log("\n==> Gate B: regression counts + type-aware completeness");
run("node", ["scripts/fallow-regression-check.mjs"]);

console.log("\nFallow CI passed.");
