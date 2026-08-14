import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SupportPage, { metadata } from "@/app/support/page";

describe("SupportPage", () => {
  it("publishes a store-ready support URL with verifiable contact details", () => {
    render(<SupportPage />);

    expect(metadata).toMatchObject({ alternates: { canonical: "/support" } });
    expect(screen.getByText("딱좋은라이프")).toBeInTheDocument();
    expect(screen.getByText("768-75-00424")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /woorimprog@gmail.com/ })).toHaveAttribute(
      "href",
      "mailto:woorimprog@gmail.com",
    );
    expect(screen.getByRole("link", { name: /010-2515-0939/ })).toHaveAttribute(
      "href",
      "tel:+821025150939",
    );
  });

  it("links to account deletion and both policies", () => {
    render(<SupportPage />);

    expect(screen.getByRole("link", { name: /계정과 데이터 삭제/ })).toHaveAttribute(
      "href",
      "/help/account-deletion",
    );
    expect(screen.getByRole("link", { name: /개인정보 처리방침/ })).toHaveAttribute(
      "href",
      "/policies/privacy",
    );
    expect(screen.getByRole("link", { name: /서비스 이용약관/ })).toHaveAttribute(
      "href",
      "/policies/terms",
    );
  });
});
