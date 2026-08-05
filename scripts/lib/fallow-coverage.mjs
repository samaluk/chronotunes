/**
 * Fallow auto-detects ./coverage for Istanbul CRAP scoring. CI checkouts usually
 * have no coverage dir, so local baseline update/check would diverge from CI.
 * Park coverage and clear FALLOW_COVERAGE* while running baseline-sensitive work.
 */
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const COVERAGE_DIR = resolve("coverage");
const PARKED_DIR = resolve(".coverage-fallow-parked");
const ISOLATED_FLAG = "FALLOW_COVERAGE_ISOLATED";

export function envWithoutCoverage(baseEnv = process.env) {
  const env = { ...baseEnv };
  delete env.FALLOW_COVERAGE;
  delete env.FALLOW_COVERAGE_ROOT;
  env[ISOLATED_FLAG] = "1";
  return env;
}

export function withCoverageIsolated(fn) {
  if (process.env[ISOLATED_FLAG] === "1") {
    return fn(envWithoutCoverage());
  }

  if (existsSync(PARKED_DIR)) {
    throw new Error(
      `Refusing to park coverage: ${PARKED_DIR} already exists. Restore or remove it first.`,
    );
  }

  const moved = existsSync(COVERAGE_DIR);
  if (moved) {
    renameSync(COVERAGE_DIR, PARKED_DIR);
  }

  try {
    return fn(envWithoutCoverage());
  } finally {
    if (moved) {
      renameSync(PARKED_DIR, COVERAGE_DIR);
    }
  }
}
