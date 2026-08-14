import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { requiredReleaseBlockerKeys } from "./mobile-release-policy.mjs";

const questionnaireKeys = [
  "googleFamilies",
  "googlePlayContentRating",
  "googleDataSafety",
  "appleAgeRatingAndUgc",
  "appleAppPrivacy",
];

export async function validateMobileReleaseEvidence({
  evidence,
  expectedAppleTeamId,
  phase = "release",
  releaseBlockers,
  root,
  screenshotPlan,
}) {
  const failures = [];
  const verifyFile = createFileVerifier(root, failures);

  if (evidence?.schemaVersion !== 1) {
    failures.push("release evidence schemaVersion must be 1");
  }
  const allowedStatus =
    phase === "preflight"
      ? ["preflight_ready", "release_ready"]
      : ["release_ready"];
  if (!allowedStatus.includes(evidence?.status)) {
    failures.push(
      `release evidence status must be ${allowedStatus.join(" or ")}`,
    );
  }

  const blockerEvidence = evidence?.blockerEvidence;
  const unexpectedEvidenceKeys = Object.keys(blockerEvidence ?? {}).filter(
    (key) => !requiredReleaseBlockerKeys.includes(key),
  );
  if (unexpectedEvidenceKeys.length > 0) {
    failures.push(
      `release blocker evidence contains unknown keys: ${unexpectedEvidenceKeys.join(", ")}`,
    );
  }
  for (const key of requiredReleaseBlockerKeys) {
    if (releaseBlockers?.[key] !== true) continue;
    await verifyApproval(
      `release blocker ${key}`,
      blockerEvidence?.[key],
      "verified",
      verifyFile,
      failures,
    );
  }

  await verifyApproval(
    "legal review",
    evidence?.legalReview,
    "approved",
    verifyFile,
    failures,
  );
  const requiredLegalScope = new Set([
    "unknown_and_guest_advertising",
    "google_families",
    "apple_age_rating",
    "apple_user_generated_content",
    "store_privacy_disclosures",
  ]);
  for (const scope of evidence?.legalReview?.scope ?? []) {
    requiredLegalScope.delete(scope);
  }
  if (requiredLegalScope.size > 0) {
    failures.push(
      `legal review evidence is missing scope: ${[...requiredLegalScope].join(", ")}`,
    );
  }

  for (const key of questionnaireKeys) {
    await verifyApproval(
      `store questionnaire ${key}`,
      evidence?.questionnaires?.[key],
      "confirmed",
      verifyFile,
      failures,
    );
  }

  if (phase === "preflight") return failures;

  const qa = evidence?.realDeviceQa;
  if (qa?.passed !== true)
    failures.push("real-device QA must be marked passed");
  verifyAuditFields("real-device QA", qa, "passedAt", failures);
  if (!qa?.iosDevice || !qa?.androidDevice) {
    failures.push("real-device QA must identify both iOS and Android devices");
  }
  const qaReportPath = await verifyFile("real-device QA report", qa?.report, [
    ".json",
  ]);
  if (qaReportPath) {
    try {
      failures.push(
        ...validateMobileQaReport(
          JSON.parse(await readFile(qaReportPath, "utf8")),
        ),
      );
    } catch {
      failures.push("real-device QA report must be valid JSON");
    }
  }

  await verifyScreenshots({
    evidence: evidence?.screenshots,
    failures,
    plan: screenshotPlan,
    verifyFile,
  });

  const artifacts = evidence?.signedArtifacts;
  if (artifacts?.verified !== true) {
    failures.push("signed release artifacts must be marked verified");
  }
  const sourceRevision = currentSourceRevision(root);
  for (const [label, descriptor] of [
    ["iOS IPA", artifacts?.ios],
    ["Android AAB", artifacts?.android],
  ]) {
    if (
      !/^[a-f0-9]{40}$/u.test(descriptor?.sourceRevision ?? "") ||
      !sourceRevision ||
      descriptor.sourceRevision !== sourceRevision
    ) {
      failures.push(`${label} must record the current Git sourceRevision`);
    }
  }
  const iosPath = await verifyFile("signed iOS IPA", artifacts?.ios, [".ipa"]);
  const androidPath = await verifyFile(
    "signed Android AAB",
    artifacts?.android,
    [".aab"],
  );
  if (iosPath) {
    await verifyIosSignature(
      iosPath,
      artifacts?.ios,
      expectedAppleTeamId,
      failures,
    );
  }
  if (androidPath) {
    verifyAndroidSignature(androidPath, artifacts?.android, failures);
  }

  return failures;
}

function createFileVerifier(root, failures) {
  return async function verifyFile(label, descriptor, extensions = []) {
    if (
      !descriptor ||
      typeof descriptor.path !== "string" ||
      !/^[a-f0-9]{64}$/u.test(descriptor.sha256 ?? "")
    ) {
      failures.push(
        `${label} must include a repository-relative path and SHA-256`,
      );
      return null;
    }

    const absolutePath = resolve(root, descriptor.path);
    const relativePath = relative(root, absolutePath);
    if (
      !relativePath ||
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`) ||
      resolve(root, relativePath) !== absolutePath
    ) {
      failures.push(`${label} path must stay inside the repository`);
      return null;
    }
    if (
      extensions.length > 0 &&
      !extensions.includes(extname(absolutePath).toLowerCase())
    ) {
      failures.push(`${label} must use one of: ${extensions.join(", ")}`);
      return null;
    }

    try {
      const [file, info] = await Promise.all([
        readFile(absolutePath),
        stat(absolutePath),
      ]);
      if (!info.isFile() || info.size === 0) {
        failures.push(`${label} must be a non-empty file`);
        return null;
      }
      const digest = createHash("sha256").update(file).digest("hex");
      if (digest !== descriptor.sha256) {
        failures.push(`${label} SHA-256 does not match the evidence manifest`);
        return null;
      }
      return absolutePath;
    } catch {
      failures.push(`${label} file is missing`);
      return null;
    }
  };
}

async function verifyApproval(
  label,
  value,
  approvalField,
  verifyFile,
  failures,
) {
  if (value?.[approvalField] !== true) {
    failures.push(`${label} must be explicitly approved`);
  }
  verifyAuditFields(
    label,
    value,
    {
      approved: "reviewedAt",
      confirmed: "confirmedAt",
      verified: "verifiedAt",
    }[approvalField],
    failures,
  );
  await verifyFile(`${label} evidence`, value?.evidence);
}

function verifyAuditFields(label, value, dateField, failures) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(
      value?.[dateField] ?? "",
    )
  ) {
    failures.push(`${label} must include an ISO UTC ${dateField}`);
  }
  if (typeof value?.reviewer !== "string" || value.reviewer.trim().length < 2) {
    failures.push(`${label} must identify the reviewer`);
  }
}

export function validateMobileQaReport(report) {
  const failures = [];
  if (report?.schemaVersion !== 1 || report?.status !== "passed") {
    failures.push(
      "real-device QA report must have schemaVersion 1 and passed status",
    );
  }
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const byId = new Map(checks.map((check) => [check.id, check]));
  const requiredChecks = new Map([
    ["oauth_google", ["ios", "android"]],
    ["oauth_kakao", ["ios", "android"]],
    ["oauth_apple", ["ios"]],
    ["oauth_callback_replay", ["ios", "android"]],
    ["deep_links", ["ios", "android"]],
    ["native_share", ["ios", "android"]],
    ["secure_session_storage", ["ios", "android"]],
    ["account_deletion", ["ios", "android"]],
    ["ugc_reporting_blocking", ["ios", "android"]],
    ["unknown_guest_ads_suppressed", ["ios", "android"]],
  ]);
  for (const [id, platforms] of requiredChecks) {
    const check = byId.get(id);
    if (check?.status !== "passed") {
      failures.push(`real-device QA check must pass: ${id}`);
      continue;
    }
    if (!isIsoUtc(check.testedAt)) {
      failures.push(`real-device QA check must include testedAt: ${id}`);
    }
    for (const platform of platforms) {
      if (!check.platforms?.includes(platform)) {
        failures.push(`real-device QA check ${id} must cover ${platform}`);
      }
    }
  }
  if (checks.some((check) => check.status !== "passed")) {
    failures.push(
      "real-device QA report must not contain pending or failed checks",
    );
  }
  return failures;
}

async function verifyScreenshots({ evidence, failures, plan, verifyFile }) {
  if (evidence?.captured !== true) {
    failures.push("store screenshots must be marked captured");
  }

  const expectedScenes = plan?.scenes?.map((scene) => scene.id) ?? [];
  for (const [store, dimensions] of [
    ["apple", plan?.capturePolicy?.applePortraitSize],
    ["google", plan?.capturePolicy?.googlePortraitSize],
  ]) {
    const entries = Array.isArray(evidence?.[store]) ? evidence[store] : [];
    const byScene = new Map(entries.map((entry) => [entry.sceneId, entry]));
    if (
      entries.length !== expectedScenes.length ||
      byScene.size !== entries.length
    ) {
      failures.push(
        `${store} screenshots must contain each planned scene exactly once`,
      );
    }
    for (const sceneId of expectedScenes) {
      const descriptor = byScene.get(sceneId);
      const path = await verifyFile(
        `${store} screenshot ${sceneId}`,
        descriptor,
        [".png"],
      );
      if (!path) continue;
      try {
        const metadata = await sharp(path).metadata();
        if (
          metadata.format !== "png" ||
          metadata.hasAlpha === true ||
          metadata.width !== dimensions?.width ||
          metadata.height !== dimensions?.height
        ) {
          failures.push(
            `${store} screenshot ${sceneId} must be an opaque ${dimensions?.width}x${dimensions?.height} PNG`,
          );
        }
      } catch {
        failures.push(`${store} screenshot ${sceneId} must be a valid PNG`);
      }
    }
    const unexpected = entries
      .map((entry) => entry.sceneId)
      .filter((sceneId) => !expectedScenes.includes(sceneId));
    if (unexpected.length > 0) {
      failures.push(
        `${store} screenshots contain unknown scenes: ${unexpected.join(", ")}`,
      );
    }
  }
}

function isIsoUtc(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(
    value ?? "",
  );
}

function verifyAndroidSignature(path, descriptor, failures) {
  const expectedFingerprint = normalizeSha256Fingerprint(
    descriptor?.uploadCertificateSha256,
  );
  if (!expectedFingerprint) {
    failures.push(
      "Android AAB evidence must include its upload signing certificate SHA-256 fingerprint",
    );
    return;
  }
  const jarsigner = resolveJavaTool("jarsigner");
  const keytool = resolveJavaTool("keytool");
  if (!jarsigner || !keytool) {
    failures.push(
      "Android AAB signature verification requires a configured JDK",
    );
    return;
  }
  const result = spawnSync(jarsigner, ["-verify", "-verbose", "-certs", path], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (
    result.status !== 0 ||
    !/jar verified/u.test(output) ||
    /jar is unsigned|unsigned entr(?:y|ies)|not signed by alias/iu.test(output)
  ) {
    failures.push(
      "Android AAB must contain a valid JAR signature over its manifest entries",
    );
    return;
  }

  const certificate = spawnSync(keytool, ["-printcert", "-jarfile", path], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  });
  const certificateOutput = `${certificate.stdout ?? ""}\n${certificate.stderr ?? ""}`;
  const actualFingerprint = normalizeSha256Fingerprint(
    /SHA256:\s*([A-Fa-f0-9:]+)/u.exec(certificateOutput)?.[1],
  );
  if (
    certificate.status !== 0 ||
    !actualFingerprint ||
    actualFingerprint !== expectedFingerprint
  ) {
    failures.push(
      "Android AAB signer certificate must match the evidence fingerprint",
    );
  }
}

async function verifyIosSignature(
  path,
  descriptor,
  expectedAppleTeamId,
  failures,
) {
  if (
    !/^[A-Z0-9]{10}$/u.test(descriptor?.teamId ?? "") ||
    !descriptor?.version ||
    !descriptor?.buildNumber
  ) {
    failures.push(
      "iOS IPA evidence must include teamId, version, and buildNumber",
    );
    return;
  }
  if (expectedAppleTeamId && descriptor.teamId !== expectedAppleTeamId) {
    failures.push("iOS IPA signing Team ID must match NUANG_APPLE_APP_ID");
    return;
  }

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "nuang-ios-signature-"),
  );
  try {
    const unpacked = spawnSync(
      "unzip",
      ["-q", path, "-d", temporaryDirectory],
      {
        encoding: "utf8",
      },
    );
    if (unpacked.status !== 0) {
      failures.push("iOS IPA must be a valid archive");
      return;
    }
    const payload = join(temporaryDirectory, "Payload");
    const apps = (await readdir(payload)).filter((entry) =>
      entry.endsWith(".app"),
    );
    if (apps.length !== 1) {
      failures.push("iOS IPA must contain exactly one Payload/*.app bundle");
      return;
    }
    const app = apps[0];
    const verified = spawnSync(
      "codesign",
      ["--verify", "--deep", "--strict", join(payload, app)],
      { encoding: "utf8" },
    );
    if (verified.status !== 0) {
      failures.push("iOS IPA must pass codesign strict signature verification");
      return;
    }

    const appPath = join(payload, app);
    const signatureDetails = spawnSync(
      "codesign",
      ["-dv", "--verbose=4", appPath],
      { encoding: "utf8" },
    );
    const signatureOutput = `${signatureDetails.stdout ?? ""}\n${signatureDetails.stderr ?? ""}`;
    if (
      signatureDetails.status !== 0 ||
      !/^Authority=Apple Distribution(?::|$)/mu.test(signatureOutput)
    ) {
      failures.push("iOS IPA must be signed by an Apple Distribution identity");
      return;
    }

    const signedEntitlements = spawnSync(
      "codesign",
      ["-d", "--entitlements", ":-", appPath],
      { encoding: "utf8" },
    );
    const entitlementsXml = extractPlist(
      `${signedEntitlements.stdout ?? ""}\n${signedEntitlements.stderr ?? ""}`,
    );
    if (signedEntitlements.status !== 0 || !entitlementsXml) {
      failures.push(
        "iOS IPA code signature entitlements could not be verified",
      );
      return;
    }
    const signedEntitlementsPath = join(
      temporaryDirectory,
      "signed-entitlements.plist",
    );
    await writeFile(signedEntitlementsPath, entitlementsXml, "utf8");
    if (
      readPlistValue(signedEntitlementsPath, "get-task-allow") !== "false" ||
      readPlistValue(signedEntitlementsPath, "application-identifier") !==
        `${descriptor.teamId}.app.nuang.mobile` ||
      readPlistValue(
        signedEntitlementsPath,
        "com.apple.developer.team-identifier",
      ) !== descriptor.teamId
    ) {
      failures.push(
        "iOS code signature must carry the exact distribution Team/App ID entitlements",
      );
      return;
    }

    const infoPath = join(appPath, "Info.plist");
    for (const [key, expected] of [
      ["CFBundleIdentifier", "app.nuang.mobile"],
      ["CFBundleShortVersionString", String(descriptor.version)],
      ["CFBundleVersion", String(descriptor.buildNumber)],
    ]) {
      if (readPlistValue(infoPath, key) !== expected) {
        failures.push(
          `iOS IPA ${key} must match release evidence: ${expected}`,
        );
      }
    }

    const provisionPath = join(appPath, "embedded.mobileprovision");
    const provisionPlist = join(temporaryDirectory, "provision.plist");
    const decoded = spawnSync(
      "security",
      ["cms", "-D", "-i", provisionPath, "-o", provisionPlist],
      { encoding: "utf8" },
    );
    if (decoded.status !== 0) {
      failures.push(
        "iOS IPA must contain a valid distribution provisioning profile",
      );
      return;
    }
    if (
      readPlistValue(provisionPlist, "Entitlements.get-task-allow") !==
        "false" ||
      readPlistValue(provisionPlist, "Entitlements.application-identifier") !==
        `${descriptor.teamId}.app.nuang.mobile` ||
      readPlistValue(provisionPlist, "TeamIdentifier.0") !==
        descriptor.teamId ||
      hasPlistValue(provisionPlist, "ProvisionedDevices") ||
      hasPlistValue(provisionPlist, "ProvisionsAllDevices") ||
      !isFuturePlistDate(provisionPlist, "ExpirationDate")
    ) {
      failures.push(
        "iOS IPA must use an App Store distribution profile with get-task-allow=false and the exact Team/App ID",
      );
    }
  } catch {
    failures.push("iOS IPA signature could not be verified");
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function currentSourceRevision(root) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function resolveJavaTool(name) {
  for (const javaHome of [
    process.env.JAVA_HOME?.trim(),
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
  ].filter(Boolean)) {
    const candidate = resolve(javaHome, "bin", name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function readPlistValue(path, key) {
  const result = spawnSync(
    "plutil",
    ["-extract", key, "raw", "-o", "-", path],
    { encoding: "utf8" },
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function hasPlistValue(path, key) {
  return readPlistValue(path, key) !== null;
}

function isFuturePlistDate(path, key) {
  const value = readPlistValue(path, key);
  return (
    value !== null &&
    Number.isFinite(Date.parse(value)) &&
    Date.parse(value) > Date.now()
  );
}

function normalizeSha256Fingerprint(value) {
  const compact = String(value ?? "")
    .replaceAll(":", "")
    .toUpperCase();
  if (!/^[A-F0-9]{64}$/u.test(compact)) return null;
  return compact.match(/.{2}/gu).join(":");
}

function extractPlist(value) {
  const start = value.indexOf("<?xml");
  const end = value.indexOf("</plist>", start);
  return start >= 0 && end >= 0
    ? value.slice(start, end + "</plist>".length)
    : null;
}
