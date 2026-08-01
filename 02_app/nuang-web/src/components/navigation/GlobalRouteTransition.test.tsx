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

  it("shows the Nuang loading character immediately for a standard route", () => {
    render(
      <>
        <GlobalRouteTransition />
        <Link href="/map" onClick={(event) => event.preventDefault()}>
          성향지도
        </Link>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "성향지도" }));
    act(() => vi.advanceTimersByTime(0));

    expect(
      screen.getByRole("heading", { name: "다음 화면을 준비하고 있어요" }),
    ).toBeInTheDocument();
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
