import { describe, expect, it, vi } from "vitest";
import {
  hasSeenOnboarding,
  markOnboardingCompleted,
  markOnboardingSeen,
  onboardingEntryContract,
  readOnboardingExperience,
} from "@/features/onboarding/onboarding-storage";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    values,
  };
}

describe("onboarding storage", () => {
  it("treats missing or invalid state as a first visit", () => {
    const storage = createMemoryStorage({
      [onboardingEntryContract.storageKey]: "not-json",
    });

    expect(hasSeenOnboarding(storage)).toBe(false);
  });

  it("records first exposure independently from completion", () => {
    const storage = createMemoryStorage();

    markOnboardingSeen(storage, new Date("2026-08-03T00:00:00.000Z"));

    expect(hasSeenOnboarding(storage)).toBe(true);
    expect(readOnboardingExperience(storage)).toEqual({
      completedAt: null,
      firstSeenAt: "2026-08-03T00:00:00.000Z",
      lastSeenGuideVersion: onboardingEntryContract.guideVersion,
    });
  });

  it("preserves the earliest seen time and stores completion separately", () => {
    const storage = createMemoryStorage();
    markOnboardingSeen(storage, new Date("2026-08-03T00:00:00.000Z"));

    markOnboardingCompleted(
      storage,
      new Date("2026-08-03T00:02:00.000Z"),
    );

    expect(readOnboardingExperience(storage)).toEqual({
      completedAt: "2026-08-03T00:02:00.000Z",
      firstSeenAt: "2026-08-03T00:00:00.000Z",
      lastSeenGuideVersion: onboardingEntryContract.guideVersion,
    });
  });

  it("migrates a valid V1 completion without re-enrolling the user", () => {
    const storage = createMemoryStorage({
      [onboardingEntryContract.legacyStorageKey]: JSON.stringify({
        completedAt: "2026-07-19T00:00:00.000Z",
        version: 1,
      }),
    });

    expect(hasSeenOnboarding(storage)).toBe(true);
    expect(readOnboardingExperience(storage)).toEqual({
      completedAt: "2026-07-19T00:00:00.000Z",
      firstSeenAt: "2026-07-19T00:00:00.000Z",
      lastSeenGuideVersion: 1,
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      onboardingEntryContract.storageKey,
      expect.any(String),
    );
  });

  it("does not require the stored guide version to equal the current version", () => {
    const storage = createMemoryStorage({
      [onboardingEntryContract.storageKey]: JSON.stringify({
        completedAt: null,
        firstSeenAt: "2026-07-01T00:00:00.000Z",
        lastSeenGuideVersion: 2,
      }),
    });

    expect(hasSeenOnboarding(storage)).toBe(true);
  });
});
