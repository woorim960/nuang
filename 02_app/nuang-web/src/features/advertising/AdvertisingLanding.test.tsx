import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdvertisingLanding } from "./AdvertisingLanding";

describe("AdvertisingLanding", () => {
  it("explains the partnership products without unsupported audience claims", () => {
    render(<AdvertisingLanding />);

    expect(
      screen.getByRole("heading", {
        name: /서로를 이해하는 브랜드 경험을 만들어보세요/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("인라인 배너")).toBeInTheDocument();
    expect(screen.getByText("문맥형 제휴 카드")).toBeInTheDocument();
    expect(screen.getByText("브랜드 함께하기 팩")).toBeInTheDocument();
    expect(
      screen.getByText(/개인의 검사 답변, 뉴앙 코드/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DAU|CTR|만 명/)).not.toBeInTheDocument();
  });

  it("offers a direct and consistent inquiry route", () => {
    render(<AdvertisingLanding />);

    const inquiryLinks = screen.getAllByRole("link", {
      name: /문의(하기| 작성하기)?/,
    });
    expect(inquiryLinks.length).toBeGreaterThanOrEqual(2);
    inquiryLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/advertise/inquiry");
    });
  });
});
