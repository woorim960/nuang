import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseBlockers } from "./lib/mobile-release-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = resolve(root, "config/mobile-store-profile.json");
const profile = JSON.parse(await readFile(profilePath, "utf8"));
const errors = [];
const warnings = [];

errors.push(...validateReleaseBlockers(profile.releaseBlockers));

assert(profile.schemaVersion === 1, "schemaVersion must be 1");
assert(profile.brand?.appName === "뉴앙", "appName must be 뉴앙");
assert(
  profile.application?.applicationId === "app.nuang.mobile",
  "applicationId must remain app.nuang.mobile",
);
assert(
  /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(
    profile.application?.applicationId ?? "",
  ),
  "applicationId must be a stable reverse-domain identifier",
);
assert(
  !profile.application?.applicationId.includes("beta"),
  "applicationId must not contain beta because it cannot be casually changed after release",
);

const businessNumber = profile.operator?.businessRegistrationNumber ?? "";
assert(
  /^\d{3}-\d{2}-\d{5}$/.test(businessNumber),
  "business registration number must use 000-00-00000 format",
);
const businessTypeCode = businessNumber.split("-")[1];
assert(
  businessTypeCode &&
    Number(businessTypeCode) >= 1 &&
    Number(businessTypeCode) <= 79,
  "business registration number must remain classified as an individual taxable business",
);
assert(
  profile.operator?.businessType === "sole_proprietor",
  "businessType must match the verified 01-79 individual taxable business code",
);

assert(
  profile.stores?.googlePlay?.accountType === "organization",
  "Google Play must use an organization account for this commercial business",
);
assert(
  profile.stores?.googlePlay?.legalOrganizationName ===
    profile.operator?.legalBusinessName,
  "Google legal organization name must match the registered business name",
);
assert(
  profile.stores?.googlePlay?.publicDeveloperName === "뉴앙",
  "Google public developer name should remain 뉴앙",
);
assert(
  profile.stores?.appleAppStore?.enrollmentType === "individual",
  "Apple requires a sole proprietor to enroll as an individual",
);
assert(
  profile.stores?.appleAppStore?.accountHolderName ===
    profile.operator?.representativeName,
  "Apple account holder must match the verified representative",
);

assert(
  profile.operator?.businessAddress?.postalAddress?.includes("고봉로 755-27"),
  "business address must match the supplied registration address",
);
assert(
  profile.operator?.publicContact?.phoneLocal === "010-2515-0939",
  "public Korean contact phone must match the approved number",
);
assert(
  /^\+8210\d{8}$/.test(profile.operator?.publicContact?.phoneE164 ?? ""),
  "public phone must include a valid Korean E.164 representation",
);
assert(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    profile.operator?.publicContact?.email ?? "",
  ),
  "public contact email must be valid",
);

if (!profile.stores?.googlePlay?.dunsNumber) {
  warnings.push(
    "Google organization enrollment is blocked until a D-U-N-S number is verified.",
  );
}
for (const [key, complete] of Object.entries(profile.releaseBlockers ?? {})) {
  if (!complete) warnings.push(`release blocker remains: ${key}`);
}

if (errors.length > 0) {
  console.error("NUANG mobile store profile check failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("NUANG mobile store profile check passed");
console.log(`- application id: ${profile.application.applicationId}`);
console.log(
  `- Google: ${profile.stores.googlePlay.legalOrganizationName} / ${profile.stores.googlePlay.publicDeveloperName}`,
);
console.log(
  `- Apple enrollment: ${profile.stores.appleAppStore.enrollmentType}`,
);
warnings.forEach((warning) => console.log(`- pending: ${warning}`));

function assert(condition, message) {
  if (!condition) errors.push(message);
}
