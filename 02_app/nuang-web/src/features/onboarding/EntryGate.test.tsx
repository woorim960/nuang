import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntryGate } from "@/features/onboarding/EntryGate";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";

const { hasCompletedOnboarding, replace } = vi.hoisted(() => ({
  hasCompletedOnboarding: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/onboarding/onboarding-storage", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/onboarding/onboarding-storage")
  >();

  return { ...actual, hasCompletedOnboarding };
});

describe("EntryGate", () => {
  beforeEach(() => {
    replace.mockReset();
    hasCompletedOnboarding.mockReset();
  });

  it("routes a first visit into onboarding", async () => {
    hasCompletedOnboarding.mockReturnValue(false);
    render(<EntryGate />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "시작 화면을 준비하고 있어요",
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        onboardingEntryContract.firstVisitDestination,
      );
    });
  });

  it("routes a completed guide visit into home", async () => {
    hasCompletedOnboarding.mockReturnValue(true);

    render(<EntryGate />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        onboardingEntryContract.completedDestination,
      );
    });
  });
});
