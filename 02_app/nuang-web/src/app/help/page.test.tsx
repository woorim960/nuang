import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HelpPage from "@/app/help/page";

describe("HelpPage", () => {
  it("puts immediate safety actions before other resources", () => {
    render(<HelpPage />);

    expect(
      screen.getByRole("heading", { name: "도움받기" }),
    ).toBeInTheDocument();
    const urgentRegion = screen.getByRole("region", {
      name: "지금 다칠 위험이 있다면",
    });
    expect(urgentRegion).toBeInTheDocument();
    expect(
      within(urgentRegion).getByRole("link", {
        name: "긴급 구조 119로 전화하기",
      }),
    ).toHaveAttribute("href", "tel:119");
    expect(
      within(urgentRegion).getByRole("link", {
        name: "경찰 긴급 신고 112로 전화하기",
      }),
    ).toHaveAttribute("href", "tel:112");
    expect(
      within(urgentRegion).getByRole("link", {
        name: "자살예방상담전화 109로 전화하기",
      }),
    ).toHaveAttribute("href", "tel:109");
  });

  it("keeps official help and privacy information available without clutter", () => {
    render(<HelpPage />);

    expect(
      screen.getByRole("heading", { name: "상황에 맞는 도움" }),
    ).toBeInTheDocument();
    expect(screen.getByText("개인정보와 안내 기준")).toBeInTheDocument();
    expect(screen.getByText("공식 안내 확인")).toBeInTheDocument();
    expect(
      screen.getByText("이 화면에서 누른 내용은 뉴앙에 저장하지 않아요."),
    ).toBeInTheDocument();
  });
});
