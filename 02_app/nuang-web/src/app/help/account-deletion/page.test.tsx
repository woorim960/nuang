import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccountDeletionHelpPage, {
  metadata,
} from "@/app/help/account-deletion/page";

describe("AccountDeletionHelpPage", () => {
  it("is a public, store-ready deletion resource", () => {
    render(<AccountDeletionHelpPage />);

    expect(metadata).toMatchObject({
      alternates: { canonical: "/help/account-deletion" },
    });
    expect(
      screen.getByRole("heading", { name: /앱을 다시 설치하지 않아도/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "로그인하고 계정 삭제" }),
    ).toHaveAttribute(
      "href",
      "/login?next=/my/settings/account/delete&reason=account_delete",
    );
    expect(
      screen.getByRole("link", { name: /삭제 요청 이메일 보내기/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:woorimprog@gmail.com"),
    );
  });

  it("clearly explains deletion scope, re-registration, and limited legal retention", () => {
    render(<AccountDeletionHelpPage />);

    expect(screen.getByText("프로필과 로그인 연결 정보")).toBeInTheDocument();
    expect(screen.getByText("검사 답변·결과·비교 기록")).toBeInTheDocument();
    expect(
      screen.getByText(/같은 Google·Kakao 계정으로 다시 가입/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/법적 보존 의무가 있는 경우에만/),
    ).toBeInTheDocument();
  });
});
