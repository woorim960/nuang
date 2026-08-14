import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMobileEnvironment } from "./lib/mobile-environment.mjs";
import { validateMobileReleaseEvidence } from "./lib/mobile-release-evidence.mjs";
import {
  isReleaseReadyUnknownAgeAdvertisingPolicy,
  requiredPreflightBlockerKeys,
  requiredReleaseBlockerKeys,
  validateReleaseBlockers,
} from "./lib/mobile-release-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseMode = process.argv.includes("--release");
const preflightMode = process.argv.includes("--preflight");
const environment = loadMobileEnvironment(root);
const failures = [];
if (releaseMode && preflightMode) {
  failures.push("choose either --preflight or --release, not both");
}
const gatedMode = releaseMode || preflightMode;
const modeLabel = releaseMode
  ? "release"
  : preflightMode
    ? "release preflight"
    : "submission draft";
const checks = [
  ["store profile", "scripts/check-mobile-store-profile.mjs"],
  ["store metadata", "scripts/check-mobile-store-metadata.mjs"],
  ["privacy disclosures", "scripts/check-mobile-privacy-disclosures.mjs"],
  ["store assets", "scripts/check-mobile-store-assets.mjs"],
  ["screenshot plan", "scripts/check-mobile-store-screenshot-plan.mjs"],
  ["native config", "scripts/check-mobile-native-config.mjs"],
];

for (const [label, script] of checks) {
  run(label, process.execPath, [resolve(root, script)]);
}
run("lockfile consistency", process.execPath, [
  resolve(root, "scripts/check-lockfile-consistency.mjs"),
]);
run("mobile environment contract tests", process.execPath, [
  "--test",
  resolve(root, "scripts/test/mobile-environment.test.mjs"),
]);
run("mobile release contract tests", process.execPath, [
  "--test",
  resolve(root, "scripts/test/mobile-release-evidence.test.mjs"),
]);
run("mobile unit tests", "npm", ["--prefix", "mobile", "test"]);
run("mobile production bundle", "npm", ["--prefix", "mobile", "run", "build"]);

const [profile, listing, privacy, screenshotPlan, releaseEvidence] =
  await Promise.all([
    readJson("config/mobile-store-profile.json"),
    readJson("config/mobile-store-listing.ko-KR.json"),
    readJson("config/mobile-privacy-disclosures.json"),
    readJson("config/mobile-store-screenshot-plan.json"),
    readJson("config/mobile-release-evidence.json"),
  ]);
failures.push(...validateReleaseBlockers(profile.releaseBlockers));
const enforcedBlockerKeys = preflightMode
  ? requiredPreflightBlockerKeys
  : requiredReleaseBlockerKeys;
const pendingBlockers = enforcedBlockerKeys.filter(
  (key) => profile.releaseBlockers?.[key] !== true,
);

if (gatedMode) {
  if (pendingBlockers.length > 0) {
    failures.push(
      `release blockers are incomplete: ${pendingBlockers.join(", ")}`,
    );
  }
  failures.push(
    ...(
      await validateMobileReleaseEvidence({
        evidence: releaseEvidence,
        expectedAppleTeamId: environment.NUANG_APPLE_APP_ID?.split(".")[0],
        phase: preflightMode ? "preflight" : "release",
        releaseBlockers: profile.releaseBlockers,
        root,
        screenshotPlan,
      })
    ).map((failure) => `release evidence: ${failure}`),
  );
  const requiredConsoleStates = [
    [
      "Apple age-rating questionnaire",
      listing.appleAppStore?.ageRatingQuestionnaire,
    ],
    [
      "Apple user-generated-content review",
      listing.appleAppStore?.userGeneratedContentReview,
    ],
    [
      "Apple App Privacy questionnaire",
      listing.appleAppStore?.appPrivacyQuestionnaire,
    ],
    [
      "Google Play content-rating questionnaire",
      listing.googlePlay?.contentRatingQuestionnaire,
    ],
    [
      "Google Data safety questionnaire",
      listing.googlePlay?.dataSafetyQuestionnaire,
    ],
    ["Google Families policy review", listing.googlePlay?.familiesPolicyReview],
  ];
  for (const [label, state] of requiredConsoleStates) {
    if (state !== "completed_in_console") {
      failures.push(`${label} must be completed in the store console`);
    }
  }
  if (
    !isReleaseReadyUnknownAgeAdvertisingPolicy(
      listing.releaseDeclarations?.ads?.unknownAndGuestAdvertisingPolicy,
    ) ||
    !isReleaseReadyUnknownAgeAdvertisingPolicy(
      privacy.initialMobileReleaseRestrictions?.unknownAgeOrGuestAdvertising,
    )
  ) {
    failures.push(
      "unknown-age and guest advertising must be suppressed and live-verified before release",
    );
  }
  run("configured mobile release environment", process.execPath, [
    resolve(root, "scripts/build-configured-mobile.mjs"),
    "--release",
    "--check",
  ]);
  if (
    !/^[A-Z0-9]{10}\.app\.nuang\.mobile$/.test(
      environment.NUANG_APPLE_APP_ID ?? "",
    )
  ) {
    failures.push(
      "NUANG_APPLE_APP_ID must contain the verified Apple Team ID and bundle ID",
    );
  }
  if (
    !hasValidSha256Fingerprint(
      environment.NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS ?? "",
    )
  ) {
    failures.push(
      "NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS must contain the Play signing SHA-256 fingerprint",
    );
  }
  run("native store toolchains", process.execPath, [
    resolve(root, "scripts/check-mobile-toolchain.mjs"),
  ]);
  if (releaseMode && !hasCleanGitWorktree()) {
    failures.push(
      "final release verification requires a clean Git worktree at the recorded source revision",
    );
  }
}

if (failures.length > 0) {
  console.error(`NUANG mobile ${modeLabel} check failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`NUANG mobile ${modeLabel} check passed`);
if (!gatedMode && pendingBlockers.length > 0) {
  console.log(
    `- ${pendingBlockers.length} product/account/toolchain/live-verification blockers remain`,
  );
  pendingBlockers.forEach((blocker) => console.log(`  · ${blocker}`));
  console.log(
    "- run npm run mobile:release:check only after every blocker is verified true",
  );
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    failures.push(`${label} failed`);
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    if (output) console.error(output);
  } else {
    console.log(`✓ ${label}`);
  }
}

function hasValidSha256Fingerprint(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .some((item) => /^([A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(item));
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

function hasCleanGitWorktree() {
  const result = spawnSync(
    "git",
    ["status", "--porcelain", "--untracked-files=normal"],
    { cwd: root, encoding: "utf8" },
  );
  return result.status === 0 && !result.stdout.trim();
}
