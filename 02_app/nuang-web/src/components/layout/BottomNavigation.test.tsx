import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BottomNavigation,
  bottomNavigationItems,
} from "@/components/layout/BottomNavigation";

const navigationMock = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: navigationMock.usePathname,
}));

describe("BottomNavigation", () => {
  beforeEach(() => {
    navigationMock.usePathname.mockReturnValue("/home");
  });

  it("renders the four primary mobile tabs in the approved order", () => {
    render(<BottomNavigation />);

    const links = screen.getAllByRole("link");

    expect(bottomNavigationItems.map((item) => item.label)).toEqual([
      "홈",
      "커뮤니티",
      "성향지도",
      "마이",
    ]);
    expect(links).toHaveLength(4);
    expect(
      links.map((link) => ({
        href: link.getAttribute("href"),
        label: link.textContent,
      })),
    ).toEqual([
      { href: "/home", label: "홈" },
      { href: "/feed", label: "커뮤니티" },
      { href: "/map", label: "성향지도" },
      { href: "/my", label: "마이" },
    ]);
    expect(
      screen.queryByRole("link", { name: "검사 탭" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["/feed/post/demo", "커뮤니티 탭"],
    ["/map/ENAKQ", "성향지도 탭"],
    ["/my/reports", "마이 탭"],
  ])("marks %s as active for %s only", (pathname, activeTabName) => {
    navigationMock.usePathname.mockReturnValue(pathname);

    render(<BottomNavigation />);

    expect(screen.getByRole("link", { name: activeTabName })).toHaveAttribute(
      "aria-current",
      "page",
    );
    screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-label") !== activeTabName)
      .forEach((link) => {
        expect(link).not.toHaveAttribute("aria-current");
      });
  });

  it("activates home only for the exact home route", () => {
    navigationMock.usePathname.mockReturnValue("/home/archive");

    render(<BottomNavigation />);

    expect(screen.getByRole("link", { name: "홈 탭" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not claim an active tab for assessment routes", () => {
    navigationMock.usePathname.mockReturnValue("/assessments/nu-core-quick");

    render(<BottomNavigation />);

    screen.getAllByRole("link").forEach((link) => {
      expect(link).not.toHaveAttribute("aria-current");
    });
  });

  it("uses one visual contract for every icon and tab", () => {
    render(<BottomNavigation />);

    screen.getAllByRole("link").forEach((link) => {
      expect(link).not.toHaveAttribute("data-primary-navigation");
      expect(link.className).not.toContain("translate-y");

      const iconContainer = link.querySelector("[data-bottom-navigation-icon]");
      const icon = iconContainer?.querySelector("svg");

      expect(iconContainer).toHaveClass(
        "h-[var(--nu-bottom-nav-icon-size)]",
        "w-[var(--nu-bottom-nav-icon-size)]",
      );
      expect(iconContainer?.className).not.toContain("nu-bottom-nav-primary");
      expect(icon).toHaveAttribute("width", "20");
      expect(icon).toHaveAttribute("height", "20");
      expect(icon).toHaveAttribute("stroke-width", "1.8");
    });
  });

  it("does not preload dynamic tabs before navigation intent", () => {
    render(<BottomNavigation />);

    const communityTab = screen.getByRole("link", {
      name: "커뮤니티 탭",
    });

    expect(communityTab).toHaveAttribute("href", "/feed");
    expect(communityTab).not.toHaveAttribute("data-primary-navigation");
    expect(communityTab.className).not.toContain("translate-y");
  });

  it("keeps four touch-safe items centered in a safe-area-aware bar", () => {
    render(<BottomNavigation />);

    const navigation = screen.getByRole("navigation", {
      name: "하단 주요 메뉴",
    });
    const bar = navigation.querySelector("[data-bottom-navigation-bar]");
    const links = screen.getAllByRole("link");

    expect(bar).toHaveClass(
      "h-[var(--nu-bottom-nav-total-height)]",
      "pb-[var(--nu-bottom-nav-safe-area-bottom)]",
      "px-[var(--nu-bottom-nav-horizontal-padding)]",
      "items-center",
      "grid-cols-4",
    );
    links.forEach((link) => {
      expect(link).toHaveClass(
        "h-[var(--nu-bottom-nav-content-height)]",
        "min-h-[var(--nu-touch-min)]",
        "min-w-[var(--nu-touch-min)]",
        "items-center",
        "justify-center",
      );

      const label = link.querySelector("[data-bottom-navigation-label]");
      expect(label).toHaveClass(
        "line-clamp-2",
        "whitespace-normal",
        "break-words",
      );
    });
  });
});
