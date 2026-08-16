#!/usr/bin/env node
/**
 * Gate D: baseline freshness.
 *
 * Regenerates every committed baseline into a temp workspace (never touching
 * the working tree) and fails when the committed files differ from a fresh
 * regeneration. This is the one-way ratchet:
 *   - worse            -> analysis gate fails
 *   - better but stale -> freshness fails
 *   - better + updated -> passes
 *
 * Health CRAP uses real coverage evidence, so the fresh regeneration runs with
 * the same coverage/coverage-final.json the committed baseline was saved with.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const EXACT_BASELINE_FILES = [
  "fallow-baselines/dead-code.json",
  "fallow-baselines/dupes.json",
  "fallow-baselines/health.json",
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

function canonicalJson(text) {
  // oxlint-disable-next-line typescript/no-unsafe-argument
  return JSON.stringify(JSON.parse(text));
}

if (!existsSync("coverage/coverage-final.json")) {
  console.error(
    "coverage/coverage-final.json missing. Run `pnpm test:coverage` first so the freshness " +
      "regeneration uses the same coverage evidence as the committed health baseline.",
  );
  process.exit(2);
}

const tempRoot = mkdtempSync(path.join(tmpdir(), "fallow-baseline-check-"));
const tempConfigPath = path.join(tempRoot, ".fallowrc.json");

try {
  copyFileSync(".fallowrc.json", tempConfigPath);

  for (const file of EXACT_BASELINE_FILES) {
    const generatedPath = path.join(tempRoot, file);
    mkdirSync(path.join(tempRoot, "fallow-baselines"), { recursive: true });

    if (file.endsWith("health.json")) {
      fallow(
        [
          "-c",
          tempConfigPath,
          "health",
          "--save-baseline",
          generatedPath,
          "--baseline-mode",
          "identity",
        ],
        { allowIssueExit: true },
      );
      continue;
    }

    const command = file.includes("dead-code") ? "dead-code" : "dupes";
    const typeAwareFlag = command === "dead-code" ? ["--type-aware"] : [];
    fallow(["-c", tempConfigPath, command, ...typeAwareFlag, "--save-baseline", generatedPath], {
      allowIssueExit: true,
    });
  }

  fallow(["-c", tempConfigPath, "dead-code", "--type-aware", "--save-regression-baseline"], {
    allowIssueExit: true,
  });

  const stale = [];

  for (const file of EXACT_BASELINE_FILES) {
    const committed = canonicalJson(readFileSync(file, "utf-8"));
    const generated = canonicalJson(readFileSync(path.join(tempRoot, file), "utf-8"));

    if (committed !== generated) {
      stale.push(file);
    }
  }

  const committedRegression = JSON.stringify(
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    JSON.parse(readFileSync(".fallowrc.json", "utf-8")).regression ?? null,
  );
  const generatedRegression = JSON.stringify(
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    JSON.parse(readFileSync(tempConfigPath, "utf-8")).regression ?? null,
  );

  if (committedRegression !== generatedRegression) {
    stale.push(".fallowrc.json (regression.baseline)");
  }

  if (stale.length > 0) {
    console.error(
      "\nCommitted Fallow baselines are stale. Run `pnpm fallow:baseline:update` and commit the results:",
    );
    for (const file of stale) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }

  console.log("Fallow baselines match the current repository state.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
