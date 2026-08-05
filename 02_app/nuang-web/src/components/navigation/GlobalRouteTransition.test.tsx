import { act, fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalRouteTransition } from "@/components/navigation/GlobalRouteTransition";

const navigationMock = vi.hoisted(() => ({
  pathname: "/home",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
  useSearchParams: () => new URLSearchParams(navigationMock.search),
}));

describe("GlobalRouteTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigationMock.pathname = "/home";
    navigationMock.search = "";
    window.history.replaceState({}, "", "/home");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not cover a standard route that finishes before the delay", () => {
    const { rerender } = render(
      <>
        <GlobalRouteTransition />
        <Link href="/map" onClick={(event) => event.preventDefault()}>
          성향지도
        </Link>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "성향지도" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    navigationMock.pathname = "/map";
    rerender(<GlobalRouteTransition />);
    act(() => vi.advanceTimersByTime(standardDelayForTest + 50));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the loading screen only when a standard route is slow", () => {
    render(
      <>
        <GlobalRouteTransition />
        <Link href="/map" onClick={(event) => event.preventDefault()}>
          성향지도
        </Link>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "성향지도" }));
    act(() => vi.advanceTimersByTime(standardDelayForTest - 1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveTextContent("화면 연결 중");
  });

  it("does not cover a community route that finishes before the delay", () => {
    const { rerender } = render(
      <>
        <GlobalRouteTransition />
        <a href="/feed" onClick={(event) => event.preventDefault()}>
          커뮤니티
        </a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "커뮤니티" }));
    expect(
      screen.queryByRole("heading", { name: "다음 화면을 준비하고 있어요" }),
    ).not.toBeInTheDocument();

    navigationMock.pathname = "/feed";

    rerender(
      <>
        <GlobalRouteTransition />
        <span>커뮤니티 화면</span>
      </>,
    );

    act(() => vi.advanceTimersByTime(communityDelayForTest + 100));

    expect(
      screen.queryByRole("heading", { name: "다음 화면을 준비하고 있어요" }),
    ).not.toBeInTheDocument();
  });

  it("shows a lightweight loading screen only when a community route is slow", () => {
    render(
      <>
        <GlobalRouteTransition />
        <a href="/feed" onClick={(event) => event.preventDefault()}>
          커뮤니티
        </a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "커뮤니티" }));
    act(() => vi.advanceTimersByTime(communityDelayForTest - 1));
    expect(
      screen.queryByRole("heading", { name: "다음 화면을 준비하고 있어요" }),
    ).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole("heading", { name: "다음 화면을 준비하고 있어요" }),
    ).toBeInTheDocument();
  });

  it("does not flash a loading overlay for a fast balance-game transition", () => {
    const { rerender } = render(
      <>
        <GlobalRouteTransition />
        <Link
          href="/assessments/together/balance-game/setup?pack=what-to-eat"
          onClick={(event) => event.preventDefault()}
        >
          방 설정
        </Link>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "방 설정" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    navigationMock.pathname = "/assessments/together/balance-game/setup";
    navigationMock.search = "pack=what-to-eat";
    rerender(<GlobalRouteTransition />);
    act(() => vi.advanceTimersByTime(balanceGameDelayForTest + 50));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not interrupt same-page or external links", () => {
    render(
      <>
        <GlobalRouteTransition />
        <a href="/home#profile">현재 화면</a>
        <a href="https://example.com">외부 화면</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "현재 화면" }));
    fireEvent.click(screen.getByRole("link", { name: "외부 화면" }));

    expect(
      screen.queryByRole("heading", { name: "다음 화면을 준비하고 있어요" }),
    ).not.toBeInTheDocument();
  });
});

const communityDelayForTest = 180;
const balanceGameDelayForTest = 120;
const standardDelayForTest = 160;
