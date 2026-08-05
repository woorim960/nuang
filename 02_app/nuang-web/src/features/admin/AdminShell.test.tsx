import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/research",
}));

describe("AdminShell", () => {
  it("keeps the desktop menu in its own scroll region while the footer stays outside", () => {
    render(
      <AdminShell adminEmail="operator@nuang.app">
        <div>관리자 본문</div>
      </AdminShell>,
    );

    const desktopNavigation = screen.getAllByRole("navigation", {
      name: "관리자 메뉴",
    })[0];
    const scrollRegion = desktopNavigation.parentElement;
    const footerLink = screen.getAllByRole("link", {
      name: "서비스 화면으로 이동",
    })[0];

    expect(scrollRegion).not.toBeNull();
    expect(scrollRegion).toContainElement(desktopNavigation);
    expect(scrollRegion).not.toContainElement(footerLink);
    expect(withinNavigation(desktopNavigation, "검사 연구")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("allows vertical wheel and trackpad scrolling without moving the fixed shell", () => {
    const stylesheet = readFileSync(
      resolve(process.cwd(), "src/features/admin/AdminShell.module.css"),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.sidebarNavigationScroll\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?flex:\s*1;[\s\S]*?overflow-y:\s*auto;/,
    );
    expect(stylesheet).toContain("overscroll-behavior: contain");
  });
});

function withinNavigation(navigation: HTMLElement, label: string) {
  const link = Array.from(navigation.querySelectorAll("a")).find(
    (element) => element.textContent?.trim() === label,
  );
  if (!link) throw new Error(`${label} 메뉴를 찾지 못했습니다.`);
  return link;
}
