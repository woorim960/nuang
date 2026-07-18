import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingGuideCarousel } from "@/features/onboarding/OnboardingGuideCarousel";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";

const { markOnboardingCompleted, replace } = vi.hoisted(() => ({
  markOnboardingCompleted: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/onboarding/onboarding-storage", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/onboarding/onboarding-storage")
    >();

  return { ...actual, markOnboardingCompleted };
});

describe("OnboardingGuideCarousel", () => {
  beforeEach(() => {
    markOnboardingCompleted.mockReset();
    replace.mockReset();
  });

  it("shows all four approved guides and starts at G01", () => {
    render(<OnboardingGuideCarousel />);

    expect(
      screen.getByRole("img", {
        name: /나를 이해하고 서로를 이해하는 성향 놀이터/,
      }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("nuang-guide-01-playground-v3.jpg"),
    );
    expect(
      screen.getByRole("img", { name: /예시 코드는 ENAKQ/ }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("nuang-guide-02-code-v2.png"),
    );
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByLabelText("전체 4개 중 1번째 가이드")).toHaveTextContent(
      "1 / 4",
    );
  });

  it("moves with pagination controls and keyboard arrows", () => {
    render(<OnboardingGuideCarousel />);

    fireEvent.click(
      screen.getByRole("button", { name: "3번째 성향 비교 소개 보기" }),
    );
    expect(screen.getByLabelText("전체 4개 중 3번째 가이드")).toHaveTextContent(
      "3 / 4",
    );

    fireEvent.keyDown(
      screen.getByRole("region", {
        name: "좌우 방향키 또는 손가락으로 넘기는 서비스 가이드",
      }),
      { key: "ArrowRight" },
    );
    expect(screen.getByLabelText("전체 4개 중 4번째 가이드")).toHaveTextContent(
      "4 / 4",
    );
  });

  it("updates the current guide after a native horizontal swipe scroll", async () => {
    render(<OnboardingGuideCarousel />);
    const track = screen.getByRole("region", {
      name: "좌우 방향키 또는 손가락으로 넘기는 서비스 가이드",
    });

    Object.defineProperty(track, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(track, "scrollLeft", {
      configurable: true,
      value: 320,
    });
    fireEvent.scroll(track);

    await waitFor(() => {
      expect(
        screen.getByLabelText("전체 4개 중 2번째 가이드"),
      ).toHaveTextContent("2 / 4");
    });
  });

  it("supports dragging the guide surface with a mouse", () => {
    render(<OnboardingGuideCarousel />);
    const track = screen.getByRole("region", {
      name: "좌우 방향키 또는 손가락으로 넘기는 서비스 가이드",
    });
    let scrollLeft = 0;

    Object.defineProperty(track, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(track, "scrollLeft", {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    });

    fireEvent.pointerDown(track, {
      button: 0,
      clientX: 300,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(track, {
      clientX: -20,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(track, {
      clientX: -20,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(screen.getByLabelText("전체 4개 중 2번째 가이드")).toHaveTextContent(
      "2 / 4",
    );
  });

  it("stores onboarding completion and opens quick core from G04", () => {
    render(<OnboardingGuideCarousel />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "4번째 빠른 코어 검사 안내 보기",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "빠른 코어 검사 시작하기" }),
    );

    expect(markOnboardingCompleted).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      onboardingEntryContract.quickCoreDestination,
    );
  });
});
