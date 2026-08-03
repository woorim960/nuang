import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingGuideCarousel } from "@/features/onboarding/OnboardingGuideCarousel";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";

const { recordOnboardingCompleted, recordOnboardingSeen, replace } = vi.hoisted(() => ({
  recordOnboardingCompleted: vi.fn(),
  recordOnboardingSeen: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/onboarding/onboarding-sync", () => {
  return { recordOnboardingCompleted, recordOnboardingSeen };
});

describe("OnboardingGuideCarousel", () => {
  beforeEach(() => {
    recordOnboardingCompleted.mockReset();
    recordOnboardingSeen.mockReset();
    replace.mockReset();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  it("renders all four approved guides as accessible HTML and starts at G01", () => {
    const { container } = render(<OnboardingGuideCarousel />);

    expect(
      [...container.querySelectorAll("h1,h2")].map((heading) =>
        heading.textContent?.replace(/\s+/g, ""),
      ),
    ).toEqual([
      "나를이해하고,서로를이해하는시작",
      "생각·감정·관계속내모습을한눈에",
      "가까운사람과더잘지내는방법",
      "가볍게답하고,내첫결과를확인해요",
    ]);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll("[data-guide-scene]")).toHaveLength(4);
    expect(
      [...container.querySelectorAll("img")].every((image) =>
        decodeURIComponent(image.getAttribute("src") ?? "").includes(
          "/assets/onboarding-v3/",
        ),
      ),
    ).toBe(true);
    expect(
      screen.getByRole("article", { name: "1. 뉴앙 소개" }),
    ).not.toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 4개 중 1번째 가이드",
    );
  });

  it("moves with next, previous, pagination, and keyboard controls", () => {
    render(<OnboardingGuideCarousel />);

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 4개 중 2번째 가이드",
    );
    expect(screen.getByRole("button", { name: "이전" })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "3번째 관계 비교 소개 보기" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 4개 중 3번째 가이드",
    );

    fireEvent.keyDown(
      screen.getByRole("region", {
        name: "좌우 방향키 또는 손가락으로 넘기는 서비스 가이드",
      }),
      { key: "ArrowRight" },
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 4개 중 4번째 가이드",
    );

    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 4개 중 3번째 가이드",
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
      expect(screen.getByRole("status")).toHaveTextContent(
        "전체 4개 중 2번째 가이드",
      );
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

    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 4개 중 2번째 가이드",
    );
  });

  it("stores onboarding completion and opens home when skipped", () => {
    render(<OnboardingGuideCarousel />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(recordOnboardingCompleted).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      onboardingEntryContract.completedDestination,
    );
  });

  it("stores onboarding completion and opens quick core from G04", () => {
    render(<OnboardingGuideCarousel />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "4번째 첫 검사 시작 안내 보기",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "내 뉴앙코드 알아보기" }),
    );

    expect(recordOnboardingCompleted).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      onboardingEntryContract.quickCoreDestination,
    );
  });

  it("does not block quick core when local completion storage fails", () => {
    recordOnboardingCompleted.mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    render(<OnboardingGuideCarousel />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "4번째 첫 검사 시작 안내 보기",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "내 뉴앙코드 알아보기" }),
    );

    expect(replace).toHaveBeenCalledWith(
      onboardingEntryContract.quickCoreDestination,
    );
  });

  it("switches slides without smooth scrolling for reduced-motion users", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(<OnboardingGuideCarousel />);
    const track = screen.getByRole("region", {
      name: "좌우 방향키 또는 손가락으로 넘기는 서비스 가이드",
    });
    const scrollTo = vi.fn();
    Object.defineProperty(track, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    Object.defineProperty(track, "clientWidth", {
      configurable: true,
      value: 320,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "2번째 다섯 글자 뉴앙코드 소개 보기",
      }),
    );

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", left: 320 });
  });

  it("records first exposure without showing a warning or changing routes", () => {
    render(<OnboardingGuideCarousel />);

    expect(recordOnboardingSeen).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/다시.*볼 수/)).not.toBeInTheDocument();
  });
});
