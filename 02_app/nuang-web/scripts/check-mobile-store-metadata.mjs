import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isKnownUnknownAgeAdvertisingPolicy } from "./lib/mobile-release-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [profile, listing, supportSource, deletionSource] = await Promise.all([
  readJson("config/mobile-store-profile.json"),
  readJson("config/mobile-store-listing.ko-KR.json"),
  read("src/app/support/page.tsx"),
  read("src/app/help/account-deletion/page.tsx"),
]);
const errors = [];

assert(listing.schemaVersion === 1, "listing schemaVersion must be 1");
assert(listing.locale === "ko-KR", "initial listing locale must be ko-KR");
assert(
  listing.common?.appName === profile.brand?.appName,
  "listing app name must match the verified store profile",
);
assert(
  listing.common?.applicationId === profile.application?.applicationId,
  "listing application id must match the stable native id",
);
assert(
  listing.common?.containsAds === profile.application?.containsAds,
  "ad declaration must match the store profile",
);
assert(
  listing.common?.minimumAccountAge === profile.application?.minimumAccountAge,
  "minimum account age must match the approved policy",
);

const apple = listing.appleAppStore ?? {};
checkCharacterLimit(apple.name, 2, 30, "Apple app name");
checkCharacterLimit(apple.subtitle, 0, 30, "Apple subtitle");
checkCharacterLimit(apple.promotionalText, 0, 170, "Apple promotional text");
checkCharacterLimit(apple.description, 1, 4_000, "Apple description");
assert(
  Buffer.byteLength(apple.keywords ?? "", "utf8") <= 100,
  "Apple keywords must be at most 100 UTF-8 bytes",
);
for (const keyword of String(apple.keywords ?? "").split(",")) {
  assert(
    characterLength(keyword.trim()) > 2,
    `Apple keyword must contain more than two characters: ${keyword}`,
  );
}

const play = listing.googlePlay ?? {};
checkCharacterLimit(play.appName, 1, 30, "Google Play app name");
checkCharacterLimit(
  play.shortDescription,
  1,
  80,
  "Google Play short description",
);
checkCharacterLimit(
  play.fullDescription,
  1,
  4_000,
  "Google Play full description",
);

for (const [field, value] of Object.entries({
  accountDeletionUrl: listing.common?.accountDeletionUrl,
  marketingUrl: listing.common?.marketingUrl,
  privacyChoicesUrl: listing.common?.privacyChoicesUrl,
  privacyPolicyUrl: listing.common?.privacyPolicyUrl,
  supportUrl: listing.common?.supportUrl,
})) {
  checkNuangHttpsUrl(value, field);
}

const allStoreText = [
  apple.name,
  apple.subtitle,
  apple.promotionalText,
  apple.description,
  apple.keywords,
  play.appName,
  play.shortDescription,
  play.fullDescription,
]
  .filter(Boolean)
  .join("\n");
assert(
  !/MBTI|엠비티아이/iu.test(allStoreText),
  "store metadata must not mislabel NUANG as MBTI",
);
assert(
  !/(?:1위|최고의|가장 정확|완벽한 검사|100% 정확)/u.test(allStoreText),
  "store metadata must not contain unverifiable superiority claims",
);
assert(
  /의료·심리 진단을 대신하지 않습니다/u.test(apple.description ?? "") &&
    /의료·심리 진단을 대신하지 않습니다/u.test(play.fullDescription ?? ""),
  "both stores must carry the self-understanding, non-diagnostic boundary",
);

assert(
  listing.releaseDeclarations?.accounts?.inAppDeletion === true &&
    listing.releaseDeclarations?.accounts?.webDeletionRequest === true,
  "account deletion must be declared for both app and web",
);
assert(
  listing.releaseDeclarations?.userGeneratedContent?.reporting === true &&
    listing.releaseDeclarations?.userGeneratedContent?.blocking === true &&
    listing.releaseDeclarations?.userGeneratedContent?.moderation === true,
  "UGC declaration must include reporting, blocking, and moderation",
);
assert(
  listing.releaseDeclarations?.ads?.minorAccountAdsSuppressed === true,
  "the store declaration must preserve minor-account ad suppression",
);
assert(
  Array.isArray(play.targetAudienceAgeGroups) &&
    play.targetAudienceAgeGroups.join(",") === "13-15,16-17,18+",
  "Google target audience must honestly cover the approved 14+ audience",
);
assert(
  play.familiesPolicyReviewRequired === true,
  "Google Families review cannot be waived while ages 14-15 are in scope",
);
assert(
  ["pending_console_answers", "completed_in_console"].includes(
    apple.ageRatingQuestionnaire,
  ) &&
    ["pending_console_answers", "completed_in_console"].includes(
      apple.userGeneratedContentReview,
    ) &&
    ["pending_console_answers", "completed_in_console"].includes(
      apple.appPrivacyQuestionnaire,
    ),
  "Apple age-rating, UGC, and App Privacy questionnaire status must be explicit",
);
assert(
  ["pending_console_answers", "completed_in_console"].includes(
    play.contentRatingQuestionnaire,
  ) &&
    ["pending_console_answers", "completed_in_console"].includes(
      play.dataSafetyQuestionnaire,
    ) &&
    ["pending_legal_and_console_review", "completed_in_console"].includes(
      play.familiesPolicyReview,
    ),
  "Google content-rating, Data safety, and Families review status must be explicit",
);
assert(
  isKnownUnknownAgeAdvertisingPolicy(
    listing.releaseDeclarations?.ads?.unknownAndGuestAdvertisingPolicy,
  ),
  "unknown-age and guest advertising policy must be explicitly blocked or verified suppressed",
);

const contact = profile.operator?.publicContact ?? {};
assert(
  supportSource.includes(contact.email) &&
    supportSource.includes(contact.phoneLocal) &&
    supportSource.includes(profile.operator?.legalBusinessName),
  "public support page must display the verified operator contact",
);
assert(
  deletionSource.includes(contact.email) &&
    deletionSource.includes("/my/settings/account/delete") &&
    deletionSource.includes("법적 보존 의무가 있는 경우에만"),
  "public deletion page must offer a working request path and explain limited retention",
);

if (errors.length > 0) {
  console.error("NUANG mobile store metadata check failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("NUANG mobile store metadata check passed");
console.log(
  `- Apple name/subtitle: ${characterLength(apple.name)}/${characterLength(apple.subtitle)} characters`,
);
console.log(
  `- Apple keywords: ${Buffer.byteLength(apple.keywords, "utf8")}/100 bytes`,
);
console.log(
  `- Google short description: ${characterLength(play.shortDescription)}/80 characters`,
);
console.log("- support, privacy, and account deletion URLs confirmed");
console.log("- age, ads, UGC, and non-diagnostic declarations confirmed");

async function read(path) {
  return readFile(resolve(root, path), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

function checkCharacterLimit(value, minimum, maximum, label) {
  const length = characterLength(value ?? "");
  assert(
    length >= minimum,
    `${label} must contain at least ${minimum} characters`,
  );
  assert(length <= maximum, `${label} must be at most ${maximum} characters`);
}

function checkNuangHttpsUrl(value, label) {
  try {
    const url = new URL(value);
    assert(url.protocol === "https:", `${label} must use HTTPS`);
    assert(url.hostname === "nuang.app", `${label} must stay on nuang.app`);
    assert(
      !url.username && !url.password,
      `${label} must not contain credentials`,
    );
  } catch {
    errors.push(`${label} must be a valid absolute URL`);
  }
}

function characterLength(value) {
  return Array.from(String(value)).length;
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}
