import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EntryGate,
  OnboardingHomeGate,
} from "@/features/onboarding/EntryGate";
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

  it("protects direct home entry until onboarding is complete", async () => {
    hasCompletedOnboarding.mockReturnValue(false);

    render(
      <OnboardingHomeGate>
        <p>홈 콘텐츠</p>
      </OnboardingHomeGate>,
    );

    expect(screen.queryByText("홈 콘텐츠")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        onboardingEntryContract.firstVisitDestination,
      );
    });
  });

  it("shows home content immediately after onboarding completion is confirmed", async () => {
    hasCompletedOnboarding.mockReturnValue(true);

    render(
      <OnboardingHomeGate>
        <p>홈 콘텐츠</p>
      </OnboardingHomeGate>,
    );

    expect(await screen.findByText("홈 콘텐츠")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
