import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EntryGate,
  OnboardingHomeGate,
} from "@/features/onboarding/EntryGate";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";

const { replace, resolveHasSeenOnboarding } = vi.hoisted(() => ({
  replace: vi.fn(),
  resolveHasSeenOnboarding: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/onboarding/onboarding-sync", () => {
  return { resolveHasSeenOnboarding };
});

describe("EntryGate", () => {
  beforeEach(() => {
    replace.mockReset();
    resolveHasSeenOnboarding.mockReset();
  });

  it("routes a first visit into onboarding", async () => {
    resolveHasSeenOnboarding.mockResolvedValue(false);
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
    resolveHasSeenOnboarding.mockResolvedValue(true);

    render(<EntryGate />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        onboardingEntryContract.completedDestination,
      );
    });
  });

  it("protects direct home entry until onboarding is complete", async () => {
    resolveHasSeenOnboarding.mockResolvedValue(false);

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
    resolveHasSeenOnboarding.mockResolvedValue(true);

    render(
      <OnboardingHomeGate>
        <p>홈 콘텐츠</p>
      </OnboardingHomeGate>,
    );

    expect(await screen.findByText("홈 콘텐츠")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
