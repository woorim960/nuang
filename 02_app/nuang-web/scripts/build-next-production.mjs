import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inheritedNodeOptions = process.env.NODE_OPTIONS?.trim() ?? "";
const memoryOption = /--max-old-space-size(?:=|\s)/.test(inheritedNodeOptions)
  ? ""
  : "--max-old-space-size=8192";
const nodeOptions = [inheritedNodeOptions, memoryOption].filter(Boolean).join(" ");

const result = spawnSync(
  process.execPath,
  [resolve(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Unable to start the NUANG production build.");
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  console.error(`NUANG production build stopped by signal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
