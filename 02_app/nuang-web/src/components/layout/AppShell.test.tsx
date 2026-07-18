import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

vi.mock("@/components/layout/BottomNavigation", () => ({
  BottomNavigation: () => <nav aria-label="하단 주요 메뉴">tabs</nav>,
}));

describe("AppShell", () => {
  it("keeps enough bottom padding for the fixed mobile navigation", () => {
    render(
      <AppShell>
        <section>content</section>
      </AppShell>,
    );

    const main = screen.getByRole("main");

    expect(main).toHaveClass("pb-[calc(82px+env(safe-area-inset-bottom))]");
    expect(main).toHaveClass("pt-[calc(20px+env(safe-area-inset-top))]");
    expect(screen.getByRole("navigation", { name: "하단 주요 메뉴" }))
      .toBeInTheDocument();
  });
});
