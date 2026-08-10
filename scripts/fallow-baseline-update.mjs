#!/usr/bin/env node
/**
 * Regenerate all Fallow exact baselines and the embedded regression baseline.
 * Exact baselines are written to fallow-baselines/*.json.
 * Regression counts are embedded in .fallowrc.json via --save-regression-baseline.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const EXACT_BASELINE_FILES = [
  "fallow-baselines/dead-code.json",
  "fallow-baselines/dupes.json",
  "fallow-baselines/health.json",
];

const BASELINES = [
  {
    label: "dead-code exact baseline",
    args: ["dead-code", "--save-baseline", "fallow-baselines/dead-code.json"],
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
    args: ["dead-code", "--save-regression-baseline"],
    allowIssueExit: true,
  },
];

function runFallow(args, env = process.env, { allowIssueExit = false } = {}) {
  // oxlint-disable-next-line typescript/no-unsafe-assignment
  const result = spawnSync("pnpm", ["exec", "fallow", ...args, "--quiet"], {
    stdio: "inherit",
    env,
  });

  if (result.error) {
    console.error(`fallow failed to start: ${result.error.message}`);
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

function rewriteJsonWithTrailingNewline(filePath) {
  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-assignment
  const value = JSON.parse(readFileSync(filePath, "utf-8"));
  // oxlint-disable-next-line typescript/no-unsafe-argument
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

mkdirSync("fallow-baselines", { recursive: true });

for (const step of BASELINES) {
  console.log(`\n==> ${step.label}`);
  for (const baselinePath of step.args.filter((arg) => arg.startsWith("fallow-baselines/"))) {
    mkdirSync(path.dirname(baselinePath), { recursive: true });
  }
  runFallow(step.args, process.env, { allowIssueExit: step.allowIssueExit });
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
