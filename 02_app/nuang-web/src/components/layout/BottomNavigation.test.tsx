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
    navigationMock.usePathname.mockReturnValue("/together/comparison/demo");

    render(<BottomNavigation />);

    expect(screen.getByRole("link", { name: "함께 탭" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "홈 탭" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
