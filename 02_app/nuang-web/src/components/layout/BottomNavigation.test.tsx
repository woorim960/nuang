import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BottomNavigation,
  bottomNavigationItems,
} from "@/components/layout/BottomNavigation";

const navigationMock = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: navigationMock.usePathname,
}));

describe("BottomNavigation", () => {
  beforeEach(() => {
    navigationMock.usePathname.mockReturnValue("/home");
  });

  it("renders the five primary mobile tabs in order", () => {
    render(<BottomNavigation />);

    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(5);
    expect(links.map((link) => link.textContent)).toEqual(
      bottomNavigationItems.map((item) => item.label),
    );
  });

  it("marks nested routes as active for the matching tab only", () => {
    navigationMock.usePathname.mockReturnValue("/feed/post/demo");

    render(<BottomNavigation />);

    expect(screen.getByRole("link", { name: "커뮤니티 탭" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "홈 탭" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps community as the emphasized primary navigation item", () => {
    render(<BottomNavigation />);

    const communityTab = screen.getByRole("link", {
      name: "커뮤니티 탭",
    });

    expect(communityTab).toHaveAttribute("data-primary-navigation", "true");
    expect(communityTab).toHaveClass("text-[var(--nu-neutral-400)]");
    expect(communityTab).not.toHaveClass(
      "text-[var(--nu-bottom-nav-primary-active-fg)]",
    );
    expect(screen.getByRole("link", { name: "홈 탭" })).not.toHaveAttribute(
      "data-primary-navigation",
    );
  });

  it("uses the brand focus on community only while the community route is active", () => {
    navigationMock.usePathname.mockReturnValue("/feed");

    render(<BottomNavigation />);

    expect(screen.getByRole("link", { name: "커뮤니티 탭" })).toHaveClass(
      "text-[var(--nu-bottom-nav-primary-active-fg)]",
    );
  });

  it("keeps the navigation content centered in a safe-area-aware bar", () => {
    render(<BottomNavigation />);

    const navigation = screen.getByRole("navigation", {
      name: "하단 주요 메뉴",
    });
    const bar = navigation.querySelector("[data-bottom-navigation-bar]");
    const links = screen.getAllByRole("link");

    expect(bar).toHaveClass(
      "h-[var(--nu-bottom-nav-total-height)]",
      "pb-[var(--nu-bottom-nav-safe-area-bottom)]",
      "items-center",
    );
    links.forEach((link) => {
      expect(link).toHaveClass(
        "h-[var(--nu-bottom-nav-content-height)]",
        "items-center",
        "justify-center",
      );
    });
  });
});
