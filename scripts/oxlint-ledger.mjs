import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ledgerPath = resolve(".lint-debt/oxlint.json");

const normalize = (contents) => {
  const parsed = JSON.parse(contents);
  delete parsed.start_time;
  parsed.diagnostics.sort((left, right) => {
    const leftLabel = left.labels[0]?.span ?? {};
    const rightLabel = right.labels[0]?.span ?? {};
    return (
      String(left.filename).localeCompare(String(right.filename)) ||
      Number(leftLabel.line ?? 0) - Number(rightLabel.line ?? 0) ||
      Number(leftLabel.column ?? 0) - Number(rightLabel.column ?? 0) ||
      String(left.code).localeCompare(String(right.code)) ||
      String(left.message).localeCompare(String(right.message))
    );
  });
  return `${JSON.stringify(parsed, null, 2)}\n`;
};

const runOxlint = () => {
  const result = spawnSync(
    "pnpm",
    ["exec", "oxlint", ".", "--ignore-pattern", ".lint-debt/**", "--format=json"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && result.status !== 1) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return normalize(result.stdout);
};

const writeLedger = (contents) => {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, contents);
};

const command = process.argv[2];

if (command === "update") {
  writeLedger(runOxlint());
  process.stdout.write(`${ledgerPath}\n`);
  process.exit(0);
}

if (command === "check") {
  const current = runOxlint();
  const committed = readFileSync(ledgerPath, "utf8");

  if (current !== committed) {
    process.stderr.write(
      `oxlint ledger changed: ${ledgerPath}\nRun pnpm lint:ledger:update and commit the result if this change is intentional.\n`,
    );
    process.exit(1);
  }

  process.exit(0);
}

process.stderr.write("Usage: node scripts/oxlint-ledger.mjs <update|check>\n");
process.exit(1);
