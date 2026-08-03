const legacyOnboardingStorageKey = "nuang:onboarding:guide-v1";
const onboardingExperienceStorageKey = "nuang:onboarding:experience";
const onboardingGuideVersion = 3;

export type OnboardingExperienceRecord = {
  completedAt: string | null;
  firstSeenAt: string;
  lastSeenGuideVersion: number;
};

type LegacyOnboardingCompletionRecord = {
  completedAt: string;
  version: number;
};

type OnboardingStorage = Pick<Storage, "getItem" | "setItem">;

export function hasSeenOnboarding(
  storage: OnboardingStorage = window.localStorage,
) {
  return readOnboardingExperience(storage) !== null;
}

export function hasCompletedOnboarding(
  storage: OnboardingStorage = window.localStorage,
) {
  return hasSeenOnboarding(storage);
}

export function readOnboardingExperience(
  storage: OnboardingStorage = window.localStorage,
): OnboardingExperienceRecord | null {
  try {
    const current = parseExperienceRecord(
      storage.getItem(onboardingExperienceStorageKey),
    );
    if (current) return current;

    const legacy = parseLegacyCompletionRecord(
      storage.getItem(legacyOnboardingStorageKey),
    );
    if (!legacy) return null;

    const migrated: OnboardingExperienceRecord = {
      completedAt: legacy.completedAt,
      firstSeenAt: legacy.completedAt,
      lastSeenGuideVersion: legacy.version,
    };
    storage.setItem(onboardingExperienceStorageKey, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function markOnboardingSeen(
  storage: OnboardingStorage = window.localStorage,
  seenAt = new Date(),
) {
  const existing = readOnboardingExperience(storage);
  const next: OnboardingExperienceRecord = {
    completedAt: existing?.completedAt ?? null,
    firstSeenAt: earlierIso(existing?.firstSeenAt, seenAt.toISOString()),
    lastSeenGuideVersion: Math.max(
      existing?.lastSeenGuideVersion ?? 0,
      onboardingGuideVersion,
    ),
  };

  storage.setItem(onboardingExperienceStorageKey, JSON.stringify(next));
  return next;
}

export function markOnboardingCompleted(
  storage: OnboardingStorage = window.localStorage,
  completedAt = new Date(),
) {
  const completedAtIso = completedAt.toISOString();
  const existing = readOnboardingExperience(storage);
  const next: OnboardingExperienceRecord = {
    completedAt: laterIso(existing?.completedAt, completedAtIso),
    firstSeenAt: earlierIso(existing?.firstSeenAt, completedAtIso),
    lastSeenGuideVersion: Math.max(
      existing?.lastSeenGuideVersion ?? 0,
      onboardingGuideVersion,
    ),
  };

  storage.setItem(onboardingExperienceStorageKey, JSON.stringify(next));
  return next;
}

function parseExperienceRecord(raw: string | null) {
  if (!raw) return null;
  const record = JSON.parse(raw) as Partial<OnboardingExperienceRecord>;
  if (!isIsoDate(record.firstSeenAt)) return null;
  if (
    record.completedAt !== null &&
    record.completedAt !== undefined &&
    !isIsoDate(record.completedAt)
  ) {
    return null;
  }
  if (
    typeof record.lastSeenGuideVersion !== "number" ||
    !Number.isInteger(record.lastSeenGuideVersion) ||
    record.lastSeenGuideVersion < 1
  ) {
    return null;
  }

  return {
    completedAt: record.completedAt ?? null,
    firstSeenAt: record.firstSeenAt,
    lastSeenGuideVersion: record.lastSeenGuideVersion,
  } satisfies OnboardingExperienceRecord;
}

function parseLegacyCompletionRecord(raw: string | null) {
  if (!raw) return null;
  const record = JSON.parse(raw) as Partial<LegacyOnboardingCompletionRecord>;
  if (record.version !== 1 || !isIsoDate(record.completedAt)) return null;
  return record as LegacyOnboardingCompletionRecord;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function earlierIso(existing: string | null | undefined, candidate: string) {
  return existing && Date.parse(existing) <= Date.parse(candidate)
    ? existing
    : candidate;
}

function laterIso(existing: string | null | undefined, candidate: string) {
  return existing && Date.parse(existing) >= Date.parse(candidate)
    ? existing
    : candidate;
}

export const onboardingEntryContract = {
  completedDestination: "/home",
  firstVisitDestination: "/onboarding",
  guideVersion: onboardingGuideVersion,
  legacyStorageKey: legacyOnboardingStorageKey,
  quickCoreDestination: "/assessments/nu-core-quick?returnTo=%2Fhome",
  storageKey: onboardingExperienceStorageKey,
  version: onboardingGuideVersion,
} as const;
