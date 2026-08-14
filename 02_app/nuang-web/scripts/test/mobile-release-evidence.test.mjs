import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  validateMobileQaReport,
  validateMobileReleaseEvidence,
} from "../lib/mobile-release-evidence.mjs";
import {
  blockedUnknownAgeAdvertisingPolicy,
  isKnownUnknownAgeAdvertisingPolicy,
  isReleaseReadyUnknownAgeAdvertisingPolicy,
  releaseReadyUnknownAgeAdvertisingPolicy,
  requiredReleaseBlockerKeys,
  validateReleaseBlockers,
} from "../lib/mobile-release-policy.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("requires the exact release blocker key set and boolean values", () => {
  const blockers = Object.fromEntries(
    requiredReleaseBlockerKeys.map((key) => [key, false]),
  );
  assert.deepEqual(validateReleaseBlockers(blockers), []);

  const missing = { ...blockers };
  delete missing.p0MobileProductFlowsComplete;
  assert.match(
    validateReleaseBlockers(missing).join("\n"),
    /p0MobileProductFlowsComplete/u,
  );
  assert.match(
    validateReleaseBlockers({}).join("\n"),
    /release blockers are missing/u,
  );
  assert.match(
    validateReleaseBlockers({ ...blockers, unexpected: false }).join("\n"),
    /release blockers are unexpected/u,
  );
  assert.match(
    validateReleaseBlockers({
      ...blockers,
      productionBuildsSigned: "yes",
    }).join("\n"),
    /must be boolean/u,
  );
});

test("allows a blocked draft advertising policy but only verified suppression for release", () => {
  assert.equal(
    isKnownUnknownAgeAdvertisingPolicy(blockedUnknownAgeAdvertisingPolicy),
    true,
  );
  assert.equal(
    isKnownUnknownAgeAdvertisingPolicy(releaseReadyUnknownAgeAdvertisingPolicy),
    true,
  );
  assert.equal(
    isReleaseReadyUnknownAgeAdvertisingPolicy(
      blockedUnknownAgeAdvertisingPolicy,
    ),
    false,
  );
  assert.equal(
    isReleaseReadyUnknownAgeAdvertisingPolicy(
      releaseReadyUnknownAgeAdvertisingPolicy,
    ),
    true,
  );
});

test("requires verifiedAt and a hashed file for every true release blocker", async () => {
  const root = await mkdtemp(join(tmpdir(), "nuang-release-evidence-test-"));
  try {
    const contents = "reviewed evidence\n";
    await writeFile(join(root, "evidence.txt"), contents, "utf8");
    const descriptor = {
      path: "evidence.txt",
      sha256: createHash("sha256").update(contents).digest("hex"),
    };
    const approval = {
      confirmed: true,
      confirmedAt: "2026-08-15T00:00:00Z",
      evidence: descriptor,
      reviewer: "QA reviewer",
    };
    const releaseBlockers = Object.fromEntries(
      requiredReleaseBlockerKeys.map((key) => [key, false]),
    );
    releaseBlockers.nativeSecureSessionStorageImplemented = true;
    const evidence = {
      blockerEvidence: {
        nativeSecureSessionStorageImplemented: {
          confirmedAt: "2026-08-15T00:00:00Z",
          evidence: descriptor,
          reviewer: "QA reviewer",
          verified: true,
        },
      },
      legalReview: {
        approved: true,
        evidence: descriptor,
        reviewedAt: "2026-08-15T00:00:00Z",
        reviewer: "Legal reviewer",
        scope: [
          "unknown_and_guest_advertising",
          "google_families",
          "apple_age_rating",
          "apple_user_generated_content",
          "store_privacy_disclosures",
        ],
      },
      questionnaires: Object.fromEntries(
        [
          "googleFamilies",
          "googlePlayContentRating",
          "googleDataSafety",
          "appleAgeRatingAndUgc",
          "appleAppPrivacy",
        ].map((key) => [key, approval]),
      ),
      schemaVersion: 1,
      status: "preflight_ready",
    };

    const first = await validateMobileReleaseEvidence({
      evidence,
      phase: "preflight",
      releaseBlockers,
      root,
      screenshotPlan: { scenes: [] },
    });
    assert.match(first.join("\n"), /verifiedAt/u);

    evidence.blockerEvidence.nativeSecureSessionStorageImplemented.verifiedAt =
      "2026-08-15T00:00:00Z";
    assert.deepEqual(
      await validateMobileReleaseEvidence({
        evidence,
        phase: "preflight",
        releaseBlockers,
        root,
        screenshotPlan: { scenes: [] },
      }),
      [],
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("rejects incomplete or pending real-device QA reports", () => {
  const platforms = ["ios", "android"];
  const checks = [
    "oauth_google",
    "oauth_kakao",
    "oauth_callback_replay",
    "deep_links",
    "native_share",
    "secure_session_storage",
    "account_deletion",
    "ugc_reporting_blocking",
    "unknown_guest_ads_suppressed",
  ].map((id) => ({
    id,
    platforms,
    status: "passed",
    testedAt: "2026-08-15T00:00:00Z",
  }));
  checks.push({
    id: "oauth_apple",
    platforms: ["ios"],
    status: "passed",
    testedAt: "2026-08-15T00:00:00Z",
  });
  assert.deepEqual(
    validateMobileQaReport({ checks, schemaVersion: 1, status: "passed" }),
    [],
  );

  checks[0].status = "pending";
  assert.match(
    validateMobileQaReport({ checks, schemaVersion: 1, status: "passed" }).join(
      "\n",
    ),
    /must pass|pending or failed/u,
  );
});

test("pins the preflight-before-build release workflow and ignores signing secrets", async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["mobile:release:prepare"],
    "npm run mobile:release:preflight && node scripts/build-configured-mobile.mjs --release --sync",
  );
  assert.equal(
    packageJson.scripts["mobile:release:check"],
    "node scripts/check-mobile-submission-readiness.mjs --release",
  );

  for (const path of [
    "mobile/private/AuthKey_TEST.p8",
    "mobile/android/key.properties",
    "mobile/android/keystore.properties",
    "mobile/android/signing.properties",
    "mobile/release/nuang.ipa",
    "mobile/release/nuang.xcarchive",
    "mobile/release/nuang.aab",
    "mobile/release-evidence/real-device-qa.json",
  ]) {
    const ignored = spawnSync(
      "git",
      ["check-ignore", "--no-index", "-q", path],
      {
        cwd: repositoryRoot,
      },
    );
    assert.equal(ignored.status, 0, `${path} must be ignored by Git`);
  }
});
