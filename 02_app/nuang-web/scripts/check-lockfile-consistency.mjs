import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const checks = [
  { cwd: root, label: "root" },
  { cwd: resolve(root, "mobile"), label: "mobile" },
];
const failures = [];

for (const check of checks) {
  const result = spawnSync(
    npmCommand,
    ["ls", "--package-lock-only", "--all"],
    { cwd: check.cwd, encoding: "utf8" },
  );
  if (result.status !== 0) {
    failures.push({
      label: check.label,
      output: `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim(),
    });
  }
}

if (failures.length > 0) {
  console.error("NUANG lockfile consistency check failed");
  for (const failure of failures) {
    console.error(`- ${failure.label} package-lock.json is incomplete`);
    if (failure.output) console.error(failure.output);
  }
  process.exit(1);
}

console.log("NUANG lockfile consistency check passed");
console.log("- root package-lock.json dependency graph confirmed");
console.log("- mobile package-lock.json dependency graph confirmed");
