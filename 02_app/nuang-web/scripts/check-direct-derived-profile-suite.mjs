import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const profiles = [
  [
    "INAKQ",
    "generate-inakq-derived-scenario-packet.mjs",
    "generate-inakq-neighbor-review.mjs",
    "generate-inakq-longform-research-draft.mjs",
  ],
  [
    "ERGMC",
    "generate-ergmc-derived-scenario-packet.mjs",
    "generate-ergmc-neighbor-review.mjs",
    "generate-ergmc-longform-research-draft.mjs",
  ],
  [
    "ERAKQ",
    "generate-erakq-derived-scenario-packet.mjs",
    "generate-erakq-neighbor-review.mjs",
    "generate-erakq-longform-research-draft.mjs",
  ],
  [
    "INGMC",
    "generate-ingmc-derived-scenario-packet.mjs",
    "generate-ingmc-neighbor-review.mjs",
    "generate-ingmc-longform-research-draft.mjs",
  ],
  [
    "ENGKQ",
    "generate-engkq-derived-scenario-packet.mjs",
    "generate-engkq-neighbor-review.mjs",
    "generate-engkq-longform-research-draft.mjs",
  ],
  [
    "IRAMC",
    "generate-iramc-derived-scenario-packet.mjs",
    "generate-iramc-neighbor-review.mjs",
    "generate-iramc-longform-research-draft.mjs",
  ],
  [
    "ENAMQ",
    "generate-enamq-derived-scenario-packet.mjs",
    "generate-enamq-neighbor-review.mjs",
    "generate-enamq-longform-research-draft.mjs",
  ],
  [
    "IRGKC",
    "generate-irgkc-derived-scenario-packet.mjs",
    "generate-irgkc-neighbor-review.mjs",
    "generate-irgkc-longform-research-draft.mjs",
  ],
  [
    "ENAKC",
    "generate-enakc-derived-scenario-packet.mjs",
    "generate-enakc-neighbor-review.mjs",
    "generate-enakc-longform-research-draft.mjs",
  ],
  [
    "IRGMQ",
    "generate-irgmq-derived-scenario-packet.mjs",
    "generate-irgmq-neighbor-review.mjs",
    "generate-irgmq-longform-research-draft.mjs",
  ],
];

for (const [code, scenarioScript, neighborScript, longformScript] of profiles) {
  run(scenarioScript, ["--check"]);
  run("generate-derived-scenario-copy-audit.mjs", [code, "--check"]);
  run(neighborScript, ["--check"]);
  run(longformScript, ["--check"]);
}

for (const auditScript of [
  "generate-ei-bridge-calibration-audit.mjs",
  "generate-nr-bridge-calibration-audit.mjs",
  "generate-ag-bridge-calibration-audit.mjs",
  "generate-km-bridge-calibration-audit.mjs",
  "generate-qc-bridge-calibration-audit.mjs",
  "generate-direct-derived-profile-completeness-audit.mjs",
]) {
  run(auditScript, ["--check"]);
}

console.log(
  "Direct-derived profile suite is current: 10 profiles, 5 axis calibrations, 1 completeness audit.",
);

function run(script, args) {
  const result = spawnSync(
    process.execPath,
    [path.join(scriptDirectory, script), ...args],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}
