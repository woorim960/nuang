import { describe, expect, it, vi } from "vitest";
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  onboardingEntryContract,
} from "@/features/onboarding/onboarding-storage";

describe("onboarding storage", () => {
  it("treats missing or invalid state as a first visit", () => {
    let storedValue: string | null = null;
    const storage = {
      getItem: vi.fn(() => storedValue),
      setItem: vi.fn(),
    };

    expect(hasCompletedOnboarding(storage)).toBe(false);
    storedValue = "not-json";
    expect(hasCompletedOnboarding(storage)).toBe(false);
  });

  it("stores and recognizes only the current completed guide version", () => {
    let value: string | null = null;
    const storage = {
      getItem: vi.fn(() => value),
      setItem: vi.fn((_key: string, nextValue: string) => {
        value = nextValue;
      }),
    };

    markOnboardingCompleted(storage, new Date("2026-07-19T00:00:00.000Z"));

    expect(storage.setItem).toHaveBeenCalledWith(
      onboardingEntryContract.storageKey,
      expect.any(String),
    );
    expect(hasCompletedOnboarding(storage)).toBe(true);
  });
});
