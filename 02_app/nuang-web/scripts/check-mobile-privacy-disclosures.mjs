import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isKnownUnknownAgeAdvertisingPolicy } from "./lib/mobile-release-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [disclosure, listing, policy, inventory] = await Promise.all([
  readJson("config/mobile-privacy-disclosures.json"),
  readJson("config/mobile-store-listing.ko-KR.json"),
  read("src/features/policy/policy-skeleton.ts"),
  read("docs/NUANG_PERSONAL_DATA_PROCESSING_INVENTORY_2026-08-05.md"),
]);
const errors = [];

assert(disclosure.schemaVersion === 1, "privacy schemaVersion must be 1");
assert(
  disclosure.global?.collectsData === true,
  "data collection must be declared",
);
assert(
  disclosure.global?.sellsPersonalData === false,
  "NUANG must not sell personal data",
);
assert(
  disclosure.global?.usesDataForCrossAppTracking === false,
  "initial mobile release must remain free of cross-app tracking",
);
assert(
  disclosure.global?.personalizedAdvertising === false,
  "initial mobile release must not use personalized advertising",
);
assert(
  disclosure.global?.encryptedInTransit === true,
  "HTTPS transport declaration is required",
);
assert(
  disclosure.global?.accountDeletionInApp === true &&
    disclosure.global?.accountDeletionWebUrl ===
      listing.common?.accountDeletionUrl,
  "privacy disclosure must match both deletion paths",
);
assert(
  disclosure.global?.privacyPolicyUrl === listing.common?.privacyPolicyUrl,
  "privacy policy URL must match store metadata",
);

const requiredDataTypes = new Set([
  "account_identifiers",
  "contact_info",
  "profile_and_user_content",
  "assessment_content",
  "product_interactions",
  "advertising_activity",
  "diagnostics_and_security",
]);
for (const dataType of disclosure.dataTypes ?? []) {
  requiredDataTypes.delete(dataType.id);
  assert(
    dataType.collected === true,
    `${dataType.id} must be marked collected`,
  );
  assert(
    dataType.shared === false,
    `${dataType.id} must not be shared outside the approved model`,
  );
  assert(
    Array.isArray(dataType.purposes) && dataType.purposes.length > 0,
    `${dataType.id} must have a declared purpose`,
  );
}
assert(
  requiredDataTypes.size === 0,
  `privacy disclosure is missing data types: ${[...requiredDataTypes].join(", ")}`,
);

const providers = new Set(
  (disclosure.serviceProviders ?? []).map((provider) => provider.name),
);
for (const provider of [
  "Supabase",
  "Vercel",
  "Google, Kakao, Naver",
  "Resend",
  "Kakao",
  "Coupang Partners",
]) {
  assert(
    providers.has(provider),
    `privacy disclosure must include ${provider}`,
  );
}
assert(
  disclosure.initialMobileReleaseRestrictions?.googleAdSense === "disabled" &&
    listing.releaseDeclarations?.ads
      ?.googleAdSenseEnabledForInitialMobileRelease === false,
  "AdSense must stay disabled in the initial mobile release",
);
assert(
  disclosure.initialMobileReleaseRestrictions?.minorAccountAdvertising ===
    "suppressed",
  "minor-account advertising must remain suppressed",
);
assert(
  isKnownUnknownAgeAdvertisingPolicy(
    disclosure.initialMobileReleaseRestrictions?.unknownAgeOrGuestAdvertising,
  ),
  "unknown-age and guest advertising policy must be explicitly blocked or verified suppressed",
);
assert(
  disclosure.initialMobileReleaseRestrictions
    ?.personalityAnswersForAdTargeting === "prohibited",
  "assessment answers must never be used for ad targeting",
);

for (const phrase of [
  "Google, Kakao, Naver",
  "계정 삭제가 완료되면 영구 삭제",
  "개인의 성향 결과를 광고 선택에 사용하지 않습니다",
  "선택형 이용 데이터 수집",
]) {
  assert(policy.includes(phrase), `privacy policy must contain: ${phrase}`);
}
for (const phrase of [
  "선택형 제품 분석",
  "광고 노출·품질",
  "요청 제한·보안 HMAC",
  "계정 삭제",
]) {
  assert(
    inventory.includes(phrase),
    `processing inventory must contain: ${phrase}`,
  );
}

if (errors.length > 0) {
  console.error("NUANG mobile privacy disclosure check failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("NUANG mobile privacy disclosure check passed");
console.log(`- ${disclosure.dataTypes.length} data categories mapped`);
console.log(
  `- ${disclosure.serviceProviders.length} service-provider entries mapped`,
);
console.log("- no sale, no cross-app tracking, no personalized ads declared");
console.log(
  "- account deletion, minor ad suppression, and consent boundaries confirmed",
);

async function read(path) {
  return readFile(resolve(root, path), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}
