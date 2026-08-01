import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminCommandMenu } from "./AdminCommandMenu";

describe("AdminCommandMenu", () => {
  it("filters administrator destinations by operational keywords", () => {
    render(<AdminCommandMenu pathname="/admin" />);

    fireEvent.click(screen.getByRole("button", { name: /빠른 이동/ }));
    fireEvent.change(
      screen.getByPlaceholderText("메뉴, 신고, 문항, 시스템 검색"),
      { target: { value: "신고" } },
    );

    expect(screen.getByRole("link", { name: /커뮤니티/ })).toHaveAttribute(
      "href",
      "/admin/community",
    );
    expect(
      screen.queryByRole("link", { name: /회원 관리/ }),
    ).not.toBeInTheDocument();
  });

  it("marks the current destination, closes with Escape, and restores focus", () => {
    render(<AdminCommandMenu pathname="/admin/content" />);

    const trigger = screen.getByRole("button", { name: /빠른 이동/ });
    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: /성향 콘텐츠/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "메뉴 및 업무 이동" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
