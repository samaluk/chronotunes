#!/usr/bin/env node
/**
 * Regenerate all Fallow exact baselines and the embedded regression baseline.
 *
 * Run after genuine fixes or intentional config changes:
 *   pnpm fallow:baseline:update
 *
 * Exact baselines are written to fallow-baselines/*.json; regression counts
 * are embedded in .fallowrc.json via --save-regression-baseline. Never
 * regenerate to hide findings — the committed baselines must only improve.
 *
 * Health CRAP uses real coverage evidence, so this script ensures
 * coverage/coverage-final.json exists first (running `pnpm test:coverage` when
 * missing). A baseline saved without coverage would silently flip the health
 * identity baseline to the static-estimate model and break freshness checks.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const EXACT_BASELINE_FILES = [
  "fallow-baselines/dead-code.json",
  "fallow-baselines/dupes.json",
  "fallow-baselines/health.json",
];

const BASELINES = [
  {
    label: "dead-code exact baseline (type-aware)",
    args: ["dead-code", "--type-aware", "--save-baseline", "fallow-baselines/dead-code.json"],
    allowIssueExit: true,
  },
  {
    label: "dupes exact baseline",
    args: ["dupes", "--save-baseline", "fallow-baselines/dupes.json"],
    allowIssueExit: true,
  },
  {
    label: "health exact baseline (identity mode)",
    args: [
      "health",
      "--save-baseline",
      "fallow-baselines/health.json",
      "--baseline-mode",
      "identity",
    ],
    allowIssueExit: true,
  },
  {
    label: "dead-code regression baseline (embedded in .fallowrc.json)",
    args: ["dead-code", "--type-aware", "--save-regression-baseline"],
    allowIssueExit: true,
  },
];

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

function rewriteJsonWithTrailingNewline(filePath) {
  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-assignment
  const value = JSON.parse(readFileSync(filePath, "utf-8"));
  // oxlint-disable-next-line typescript/no-unsafe-argument
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

console.log("==> Coverage precondition");
if (!existsSync("coverage/coverage-final.json")) {
  console.log("coverage/coverage-final.json missing; running `pnpm test:coverage` first.");
  run("pnpm", ["test:coverage"]);
}

mkdirSync("fallow-baselines", { recursive: true });

for (const step of BASELINES) {
  console.log(`\n==> ${step.label}`);
  for (const baselinePath of step.args.filter((arg) => arg.startsWith("fallow-baselines/"))) {
    mkdirSync(path.dirname(baselinePath), { recursive: true });
  }
  fallow(step.args, { allowIssueExit: step.allowIssueExit });
}

for (const file of EXACT_BASELINE_FILES) {
  rewriteJsonWithTrailingNewline(file);
}

// Fallow may append a second regression block; normalize to a single embedded baseline.
// oxlint-disable-next-line typescript/no-unsafe-assignment
const config = JSON.parse(readFileSync(".fallowrc.json", "utf-8"));
// oxlint-disable-next-line typescript/no-unsafe-member-access
if (config.regression?.baseline) {
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
  config.regression = { baseline: config.regression.baseline };
  writeFileSync(".fallowrc.json", `${JSON.stringify(config, null, 2)}\n`);
}

console.log("\nFallow baselines updated.");
