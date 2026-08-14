import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  loadMobileEnvironment,
  validateMobileSupabaseEnvironment,
} from "./lib/mobile-environment.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const sync = process.argv.includes("--sync");
const source = loadMobileEnvironment(root);
const mapped = {
  VITE_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  VITE_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
};
const failures = validateMobileSupabaseEnvironment({
  anonKey: mapped.VITE_SUPABASE_ANON_KEY,
  url: mapped.VITE_SUPABASE_URL,
});

if (failures.length > 0) {
  console.error("NUANG configured mobile environment check failed");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("NUANG configured mobile environment check passed");
console.log(
  "- Supabase public mobile environment mapped without printing values",
);
console.log("- Apple provider: hard-disabled pending server registry rollout");

if (checkOnly) process.exit(0);

run("build", ["--prefix", "mobile", "run", "build"]);
if (sync) run("sync", ["--prefix", "mobile", "run", "sync:prepared"]);

function run(label, args) {
  const result = spawnSync("npm", args, {
    cwd: root,
    env: { ...process.env, ...mapped },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`NUANG configured mobile ${label} failed`);
    process.exit(result.status ?? 1);
  }
}
