const onboardingStorageKey = "nuang:onboarding:guide-v1";
const onboardingVersion = 1;

type OnboardingCompletionRecord = {
  completedAt: string;
  version: number;
};

type OnboardingStorage = Pick<Storage, "getItem" | "setItem">;

export function hasCompletedOnboarding(
  storage: OnboardingStorage = window.localStorage,
) {
  try {
    const raw = storage.getItem(onboardingStorageKey);
    if (!raw) return false;

    const record = JSON.parse(raw) as Partial<OnboardingCompletionRecord>;
    return (
      record.version === onboardingVersion &&
      typeof record.completedAt === "string" &&
      !Number.isNaN(Date.parse(record.completedAt))
    );
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(
  storage: OnboardingStorage = window.localStorage,
  completedAt = new Date(),
) {
  const record: OnboardingCompletionRecord = {
    completedAt: completedAt.toISOString(),
    version: onboardingVersion,
  };

  storage.setItem(onboardingStorageKey, JSON.stringify(record));
}

export const onboardingEntryContract = {
  completedDestination: "/home",
  firstVisitDestination: "/onboarding",
  quickCoreDestination: "/assessments/nu-core-quick?returnTo=%2Fhome",
  storageKey: onboardingStorageKey,
  version: onboardingVersion,
} as const;
