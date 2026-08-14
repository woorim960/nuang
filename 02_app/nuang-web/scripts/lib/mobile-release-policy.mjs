export const requiredReleaseBlockerKeys = Object.freeze([
  "p0MobileProductFlowsComplete",
  "nativeSecureSessionStorageImplemented",
  "nativeOAuthReturnImplemented",
  "nativeShareAndDeepLinksLiveVerified",
  "unknownAndGuestAdvertisingSuppressionVerified",
  "legalReviewApproved",
  "googleFamiliesPolicyReviewCompleted",
  "googleContentRatingQuestionnaireCompleted",
  "googleDataSafetyPublished",
  "appleAgeRatingAndUgcQuestionnaireCompleted",
  "appleAppPrivacyPublished",
  "googleDunsVerified",
  "googlePlayAccountEnrolled",
  "appleDeveloperAccountEnrolled",
  "appleAccountHolderAddressVerifiedPrivately",
  "appleSignInAppIdConfigured",
  "appleSignInServicesIdConfigured",
  "appleSignInKeyConfigured",
  "appleSignInSupabaseProviderVerified",
  "appleSignInLiveVerified",
  "iosAssociatedDomainTeamIdConfigured",
  "androidPlaySigningFingerprintConfigured",
  "xcode26OrNewerInstalled",
  "androidToolchainInstalled",
  "storeAgreementsAccepted",
  "reviewAccountCreated",
  "realDeviceQaPassed",
  "storeScreenshotsCaptured",
  "productionBuildsSigned",
  "releaseEvidenceManifestVerified",
]);

const postBuildReleaseBlockerKeys = new Set([
  "nativeShareAndDeepLinksLiveVerified",
  "unknownAndGuestAdvertisingSuppressionVerified",
  "appleSignInLiveVerified",
  "realDeviceQaPassed",
  "storeScreenshotsCaptured",
  "productionBuildsSigned",
  "releaseEvidenceManifestVerified",
]);

export const requiredPreflightBlockerKeys = Object.freeze(
  requiredReleaseBlockerKeys.filter(
    (key) => !postBuildReleaseBlockerKeys.has(key),
  ),
);

export const blockedUnknownAgeAdvertisingPolicy =
  "release_blocked_until_suppression_is_verified";
export const releaseReadyUnknownAgeAdvertisingPolicy =
  "suppressed_until_age_verified";

export function isKnownUnknownAgeAdvertisingPolicy(value) {
  return (
    value === blockedUnknownAgeAdvertisingPolicy ||
    value === releaseReadyUnknownAgeAdvertisingPolicy
  );
}

export function isReleaseReadyUnknownAgeAdvertisingPolicy(value) {
  return value === releaseReadyUnknownAgeAdvertisingPolicy;
}

export function validateReleaseBlockers(value) {
  const failures = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["releaseBlockers must be an object"];
  }

  const actualKeys = Object.keys(value);
  const required = new Set(requiredReleaseBlockerKeys);
  const missing = requiredReleaseBlockerKeys.filter(
    (key) => !Object.hasOwn(value, key),
  );
  const unexpected = actualKeys.filter((key) => !required.has(key));
  if (missing.length > 0) {
    failures.push(`release blockers are missing: ${missing.join(", ")}`);
  }
  if (unexpected.length > 0) {
    failures.push(`release blockers are unexpected: ${unexpected.join(", ")}`);
  }
  for (const key of actualKeys) {
    if (typeof value[key] !== "boolean") {
      failures.push(`release blocker must be boolean: ${key}`);
    }
  }
  return failures;
}
